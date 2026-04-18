"""
Supplier-payment contagion graph for PayPulse.

Core idea: banks see their SME borrowers as isolated nodes. In reality the
SMEs are nodes in a dense network of buyer-supplier relationships. When one
firm starts stretching payments, its *suppliers* absorb working-capital
pressure — and if those suppliers happen to also be bank borrowers (they
very often are), the distress propagates directly through the bank's book.

This module builds that graph from the bank's own payment data and runs a
discrete-time contagion simulation:

  - nodes           SMEs (bank borrowers)
  - edges           directed, from buyer to supplier; weighted by 52-week
                    invoice volume on that relationship
  - seed            a node marked as "distressed" at t=0
  - propagation     at each step, each supplier of a distressed node gets
                    hit with stress proportional to its exposure share;
                    nodes whose accumulated incoming stress crosses a
                    threshold become distressed in the next step and
                    propagate further

The output is the set of bank-book SMEs predicted to be impacted within
H weeks of a seed event, with £-denominated exposure-at-risk per node.

No heavy ML deps. Pure numpy + pandas. networkx is NOT a hard requirement.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Iterable
import numpy as np
import pandas as pd


DEFAULT_STRESS_THRESHOLD = 0.25
DEFAULT_DECAY = 0.85
DEFAULT_STEPS = 8


def build_exposure_graph(payments_df: pd.DataFrame) -> dict:
    """
    Build a buyer -> supplier exposure graph from payment records.

    Treats each distinct `supplier_name` within a firm as a node on the
    supplier side and each `company_id` as a node on the buyer side. If a
    supplier name matches a known bank-book company name, the supplier
    node is collapsed into that company node — modelling the reality that
    many of the bank's SMEs are each other's suppliers.

    Args:
        payments_df: as produced by `src.data.portfolio.generate_portfolio`,
            must contain company_id, company_name, supplier_name,
            invoice_amount, week_number.

    Returns:
        dict with:
            nodes: list of {id, label, kind, total_payables, total_receivables}
            edges: list of {source, target, weight}
            bank_book: set of company_ids the bank lends to
    """
    buyers = payments_df.groupby("company_id").agg(
        company_name=("company_name", "first"),
        total_payables=("invoice_amount", "sum"),
    ).reset_index()
    bank_book_names = {row["company_name"].lower(): row["company_id"] for _, row in buyers.iterrows()}

    edges = defaultdict(float)
    supplier_volumes = defaultdict(float)
    for _, row in payments_df.iterrows():
        buyer = row["company_id"]
        supplier_raw = str(row["supplier_name"]).lower()
        # Fold supplier into a bank-book node if it matches one
        target = bank_book_names.get(supplier_raw, f"SUP::{supplier_raw}")
        edges[(buyer, target)] += float(row["invoice_amount"])
        supplier_volumes[target] += float(row["invoice_amount"])

    nodes = []
    all_node_ids = set([buyer for buyer, _ in edges.keys()]) | set([t for _, t in edges.keys()])
    buyer_name_map = dict(zip(buyers["company_id"], buyers["company_name"]))
    for nid in all_node_ids:
        if nid in buyer_name_map:
            nodes.append({
                "id": nid,
                "label": buyer_name_map[nid],
                "kind": "bank_borrower",
                "total_payables": float(buyers.loc[buyers["company_id"] == nid, "total_payables"].iloc[0]),
                "total_receivables": float(supplier_volumes.get(nid, 0.0)),
            })
        else:
            nodes.append({
                "id": nid,
                "label": nid.replace("SUP::", "").title(),
                "kind": "external_supplier",
                "total_payables": 0.0,
                "total_receivables": float(supplier_volumes.get(nid, 0.0)),
            })

    edge_list = [
        {"source": s, "target": t, "weight": float(w)}
        for (s, t), w in edges.items()
    ]

    return {
        "nodes": nodes,
        "edges": edge_list,
        "bank_book": set(buyers["company_id"].tolist()),
    }


def _normalize_outgoing(edges: list[dict]) -> dict:
    """Return {source: {target: share}} where shares sum to 1 per source."""
    out = defaultdict(dict)
    totals = defaultdict(float)
    for e in edges:
        totals[e["source"]] += e["weight"]
    for e in edges:
        total = totals[e["source"]]
        if total > 0:
            out[e["source"]][e["target"]] = e["weight"] / total
    return out


def _normalize_incoming(edges: list[dict]) -> dict:
    """Return {target: {source: share}} — receivables concentration."""
    out = defaultdict(dict)
    totals = defaultdict(float)
    for e in edges:
        totals[e["target"]] += e["weight"]
    for e in edges:
        total = totals[e["target"]]
        if total > 0:
            out[e["target"]][e["source"]] = e["weight"] / total
    return out


def simulate_contagion(
    graph: dict,
    seed_ids: Iterable[str],
    steps: int = DEFAULT_STEPS,
    stress_threshold: float = DEFAULT_STRESS_THRESHOLD,
    decay: float = DEFAULT_DECAY,
) -> dict:
    """
    Propagate distress from a set of seed nodes across the exposure graph.

    Mechanism:
      - A node in distress transmits stress to each of ITS suppliers (out-
        edges) proportional to that supplier's receivables-share from this
        buyer. I.e. a supplier that depends on the distressed firm for 60%
        of its income absorbs 0.6 units of stress, not 1.0.
      - A node becomes distressed when its cumulative incoming stress
        crosses `stress_threshold`.
      - Stress decays by `decay` per step to reflect working-capital
        buffers, bridge finance, etc.

    Args:
        graph: output of `build_exposure_graph`.
        seed_ids: iterable of node ids to mark as distressed at t=0.
        steps: number of propagation steps (weeks).
        stress_threshold: cumulative stress required to flip a node.
        decay: multiplicative decay on accumulated stress per step.

    Returns:
        dict with:
            impacted: list of {id, label, first_impacted_step, stress,
                               exposure_at_risk}
            timeline: list of {step, newly_impacted}
            summary: totals
    """
    incoming = _normalize_incoming(graph["edges"])
    id_to_node = {n["id"]: n for n in graph["nodes"]}
    seed_set = {s for s in seed_ids if s in id_to_node}

    distressed = {s: 0 for s in seed_set}
    stress = defaultdict(float)
    for s in seed_set:
        stress[s] = 1.0
    timeline = []

    for step in range(1, steps + 1):
        new_stress = defaultdict(float)
        for target, sources in incoming.items():
            for src, share in sources.items():
                if src in distressed:
                    new_stress[target] += share * 1.0

        newly_distressed = []
        for node_id, gained in new_stress.items():
            stress[node_id] = stress[node_id] * decay + gained
            if node_id not in distressed and stress[node_id] >= stress_threshold:
                distressed[node_id] = step
                newly_distressed.append(node_id)

        timeline.append({"step": step, "newly_impacted": newly_distressed})
        if not newly_distressed and step > 1:
            # no change: propagation settled
            pass

    impacted = []
    for node_id, step in distressed.items():
        if node_id in seed_set:
            continue
        node = id_to_node[node_id]
        impacted.append({
            "id": node_id,
            "label": node["label"],
            "kind": node["kind"],
            "first_impacted_step": int(step),
            "stress": round(float(stress[node_id]), 3),
            "exposure_at_risk": round(float(node["total_payables"] + node["total_receivables"]), 2),
        })

    impacted.sort(key=lambda x: (x["first_impacted_step"], -x["exposure_at_risk"]))
    bank_book = graph["bank_book"]
    bank_impacted = [x for x in impacted if x["id"] in bank_book]

    return {
        "seeds": sorted(seed_set),
        "impacted": impacted,
        "bank_book_impacted": bank_impacted,
        "timeline": timeline,
        "summary": {
            "n_seeds": len(seed_set),
            "n_impacted_total": len(impacted),
            "n_bank_book_impacted": len(bank_impacted),
            "total_exposure_at_risk": round(
                sum(x["exposure_at_risk"] for x in bank_impacted), 2
            ),
            "steps": steps,
            "stress_threshold": stress_threshold,
        },
    }


def top_systemic_nodes(graph: dict, k: int = 10) -> list[dict]:
    """
    Rank bank-book nodes by systemic importance using out-degree centrality
    weighted by exposure: roughly how much downstream damage would occur
    if this node failed.

    This is a cheap structural precursor to a full Katz / eigenvector
    centrality — fine for a demo and interpretable to a credit committee.
    """
    outgoing = _normalize_outgoing(graph["edges"])
    scores = []
    id_to_node = {n["id"]: n for n in graph["nodes"]}
    for node_id in graph["bank_book"]:
        downstream = outgoing.get(node_id, {})
        downstream_exposure = 0.0
        for tgt, share in downstream.items():
            tgt_node = id_to_node.get(tgt)
            if tgt_node is None:
                continue
            downstream_exposure += share * tgt_node.get("total_receivables", 0.0)
        scores.append({
            "id": node_id,
            "label": id_to_node[node_id]["label"],
            "systemic_score": round(float(downstream_exposure), 2),
            "n_downstream": len(downstream),
        })
    scores.sort(key=lambda x: -x["systemic_score"])
    return scores[:k]

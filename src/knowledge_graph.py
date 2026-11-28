from __future__ import annotations

from collections import defaultdict
from itertools import combinations
import networkx as nx
import plotly.graph_objects as go


def build_knowledge_graph(extracted_chunks: list[dict], entity_records: list[dict]) -> nx.Graph:
    """
    Construct a Literature & Study Graph:
    - Connects documents to Characters (PERSON), Settings (GPE/LOC), and Motifs (MOTIF)
    - Adds direct Character-to-Character & Character-to-Setting edges when they co-occur in the same passage!
    """
    G = nx.Graph()
    seen_docs = set()

    for chunk in extracted_chunks:
        doc_id = chunk["document_id"]
        doc_name = chunk["document_name"]
        if doc_id not in seen_docs:
            G.add_node(doc_id, node_type="document", label=doc_name, title=f"📄 Text: {doc_name}")
            seen_docs.add(doc_id)

    chunk_entities = defaultdict(list)

    for ent in entity_records:
        doc_id = ent["document_id"]
        chunk_id = ent.get("chunk_id", "")
        ent_text = ent["entity_text"]
        ent_label = ent["entity_label"]

        ent_node_id = f"ent:{ent_text.lower()}"
        if not G.has_node(ent_node_id):
            G.add_node(
                ent_node_id,
                node_type="entity",
                label=ent_text,
                entity_label=ent_label,
                title=f"[{ent_label}] {ent_text}"
            )

        if G.has_edge(doc_id, ent_node_id):
            G[doc_id][ent_node_id]["weight"] += 1
        else:
            G.add_edge(doc_id, ent_node_id, weight=1, relationship="appears_in")

        if chunk_id and ent_label in {"PERSON", "GPE", "LOC"}:
            chunk_entities[chunk_id].append(ent_node_id)

    # Build direct scene/passage co-occurrence edges between Characters & Settings
    for _, nodes in chunk_entities.items():
        unique_nodes = sorted(set(nodes))
        for u, v in combinations(unique_nodes, 2):
            if G.has_edge(u, v):
                G[u][v]["weight"] += 1
            else:
                G.add_edge(u, v, weight=1, relationship="co_occurs")

    return G


def get_learning_roadmap(G: nx.Graph, max_topics: int = 8) -> list[dict]:
    """
    Rank extracted Characters, Settings, and Motifs to create a guided
    Foundation -> Deep Dive study path.
    """
    topics = []
    for node, data in G.nodes(data=True):
        if data.get("node_type") == "entity":
            lbl = data.get("entity_label", "MOTIF")
            connections = G.degree(node)
            total_mentions = sum(G[node][nbr].get("weight", 1) for nbr in G.neighbors(node))
            # Prioritize Characters (PERSON) and recurring Motifs
            type_bonus = 4 if lbl == "PERSON" else 2 if lbl in {"GPE", "LOC"} else 1
            topics.append({
                "node_id": node,
                "label": data["label"],
                "entity_label": lbl,
                "connections": connections,
                "mentions": total_mentions,
                "score": (connections * 2) + total_mentions + type_bonus,
            })

    topics.sort(key=lambda x: x["score"], reverse=True)
    selected = topics[:max_topics]

    for idx, topic in enumerate(selected):
        if idx < 2:
            topic["stage"] = "🟢 Stage 1: Core Focus"
        elif idx < 5:
            topic["stage"] = "🟡 Stage 2: Key Connections"
        else:
            topic["stage"] = "🔵 Stage 3: Deep Dive"

    return selected


def create_concept_mindmap(G: nx.Graph, focus_node: str, mastered_nodes: set[str]) -> go.Figure:
    """
    Create a radial Mind-Map centered on the selected Character, Setting, or Motif,
    showing both the texts it appears in and co-occurring characters/places.
    """
    if not focus_node or not G.has_node(focus_node):
        return go.Figure().update_layout(title=dict(text="Select a topic from your Learning Path to explore."))

    G_sub = nx.ego_graph(G, focus_node, radius=1)
    neighbors = [n for n in G_sub.nodes() if n != focus_node]
    pos = nx.shell_layout(G_sub, nlist=[[focus_node], neighbors])

    edge_x, edge_y = [], []
    for edge in G_sub.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        line=dict(width=2.5, color="#90caf9"),
        hoverinfo="none",
        mode="lines"
    )

    node_x, node_y, node_labels, node_hover, node_color, node_size = [], [], [], [], [], []

    type_colors = {
        "document": "#1565c0",  # Blue (Readings)
        "PERSON": "#ad1457",    # Magenta (Characters/Authors)
        "GPE": "#2e7d32",       # Green (Locations/Settings)
        "LOC": "#2e7d32",
        "ORG": "#6a1b9a",       # Purple (Institutions)
        "MOTIF": "#ef6c00",     # Orange (Motifs/Concepts)
    }

    for node in G_sub.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        data = G_sub.nodes[node]

        if node == focus_node:
            is_mastered = node in mastered_nodes
            status = "✅ Mastered" if is_mastered else "🎯 Studying Now"
            node_labels.append(f"<b>{data['label']}</b><br>({status})")
            node_hover.append(f"{data['label']} | Status: {status}")
            node_color.append("#00897b" if is_mastered else "#ff6f00")
            node_size.append(36)
        elif data.get("node_type") == "document":
            clean_name = data["label"].replace(".pdf", "")
            mentions = G_sub[focus_node][node].get("weight", 1)
            node_labels.append(f"📄 {clean_name}<br>({mentions}x)")
            node_hover.append(f"Appears in {data['label']} ({mentions} times)")
            node_color.append(type_colors["document"])
            node_size.append(24)
        else:
            lbl = data.get("entity_label", "MOTIF")
            co_count = G_sub[focus_node][node].get("weight", 1)
            tag = "👤" if lbl == "PERSON" else "📍" if lbl in {"GPE", "LOC"} else "🏷️"
            node_labels.append(f"{tag} {data['label']}<br>({co_count} scene{'s' if co_count > 1 else ''})")
            node_hover.append(f"Connected [{lbl}]: {data['label']}")
            node_color.append(type_colors.get(lbl, "#546e7a"))
            node_size.append(22)

    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode="markers+text",
        text=node_labels,
        textposition="bottom center",
        textfont=dict(size=12),
        hoverinfo="text",
        hovertext=node_hover,
        marker=dict(
            showscale=False,
            color=node_color,
            size=node_size,
            line=dict(width=2, color="#ffffff")
        )
    )

    fig = go.Figure(
        data=[edge_trace, node_trace],
        layout=go.Layout(
            title=dict(text=f"🧠 Interactive Mind-Map: {G.nodes[focus_node]['label']}", font=dict(size=16)),
            showlegend=False,
            hovermode="closest",
            margin=dict(b=40, l=20, r=20, t=50),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-1.5, 1.5]),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-1.5, 1.5]),
            height=380
        )
    )
    return fig
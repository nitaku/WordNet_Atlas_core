from graph_tool.all import *

g = load_graph('wnen30_core_noun_tree_longest_w_senses.graphml.xml.gz')

graph = {
    'nodes': [],
    'links': []
}

is_synset = g.vertex_properties['is_synset']

lemma = g.vertex_properties['lemma']
sensenum = g.vertex_properties['sensenum']
pos = g.vertex_properties['pos']

senseid = g.vertex_properties['senseid']
sensekey = g.vertex_properties['sensekey']

synsetid = g.vertex_properties['synsetid']
definition = g.vertex_properties['definition']

is_core_sense = g.vertex_properties['is_core_sense']
tree_link = g.edge_properties['tree_link']

for v in g.vertices():
    if not is_synset[v]:
        o = {
            'type': 'sense',
            'lemma': lemma[v],
            'sensenum': sensenum[v],
            'pos': pos[v],
            'id': senseid[v], # sense and synset id does not collide in wnen30
            'sensekey': sensekey[v]
        }
        if is_core_sense[v]:
            o['is_core'] = True
        
    else:
        assert is_synset[v]
        o = {
            'type': 'synset',
            'id': synsetid[v], # sense and synset id does not collide in wnen30
            'defintion': definition[v],
            'pos': pos[v]
        }
        
    graph['nodes'].append(o)
    
for e in g.edges():
    source = e.source()
    target = e.target()
    
    if not is_synset[source]:
        # source is a leaf (a sense)
        source_id = senseid[source]
    else:
        assert is_synset[source]
        source_id = synsetid[source]
        
    if not is_synset[target]:
        # target is a leaf (a sense)
        target_id = senseid[target]
    else:
        assert is_synset[target]
        target_id = synsetid[target]
        
    o = {'source': source_id, 'target': target_id}
    if tree_link[e]:
        o['is_tree_link'] = True
        
    graph['links'].append(o)
    
import json
with open('wnen30_core_n_longest.json','wb') as f:
    f.write(json.dumps(graph))
    
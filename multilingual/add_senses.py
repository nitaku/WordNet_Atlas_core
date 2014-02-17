import sys
lang = sys.argv[1]

print 'Loading the synset graph...'
from graph_tool.all import *

g = load_graph('wnen30_core_noun_tree_longest_synsets_only.graphml.xml.gz')

is_synset = g.vertex_properties['is_synset']
lemma_p = g.new_vertex_property('string')
g.vertex_properties['lemma'] = lemma_p
pos_p = g.vertex_properties['pos']

tree_link = g.edge_properties['tree_link']

print 'Indexing synsets...'
index = {}
synsetid_p = g.vertex_properties['synsetid']

for synset in g.vertices():
    index[synsetid_p[synset]] = synset
    
print 'Adding senses...'
i = 0
for line in open(lang+'/wn-data-'+lang+'.tab'):
    if line.startswith('#'):
        continue
        
    sense = line.rstrip().split('\t')   
    strange_synset_id = sense[0].split('-')
    part_synset_id = strange_synset_id[0]
    pos = strange_synset_id[1]
    # assert sense[1] == 'lemma' ignore the second column
    lemma = sense[2]
    
    if lemma.endswith('GAP!'): # ignore strange placeholders
        continue
        
    synset_id = int({'n': '1', 'v': '2', 'a': '3', 'r': '4', 's': '5'}[pos] + part_synset_id)
    
    if synset_id in index:
        v = g.add_vertex()
        # senses[row['senseid']] = v
        
        is_synset[v] = 0
        
        lemma_p[v] = lemma
        pos_p[v] = pos
        # sensenum[v] = row['sensenum']
        
        # senseid[v] = row['senseid']
        # sensekey[v] = row['sensekey']
        
        # is_core_sense[v] = 0
        
        e = g.add_edge(index[synset_id],v)
        tree_link[e] = 1 # links to senses have to be retained
        
        # make sure that this vertex will be exported
        # retained[v] = 1
        
        i += 1
        print 'Added senses: %d\r' % i,
        
print
print 'Saving the graph...'
g.save(lang+'/wnen30_core_noun_tree_longest_w_senses_'+lang+'.graphml.xml.gz')

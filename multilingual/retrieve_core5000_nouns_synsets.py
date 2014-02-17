print 'Reading the list of sensekeys...'
sensekeys = [line.rstrip() for line in open('wnen30_core5000_nouns_sensekeys.txt')]

print 'Connecting to WordNet 3.0 MySQL database...'
import MySQLdb
import MySQLdb.cursors

def get_cursor():
    return MySQLdb.connect(
        host='opendata',
        db='wordnet_en_3.0',
        user='read',
        passwd='read',
        cursorclass=MySQLdb.cursors.DictCursor,
        use_unicode=True,
        charset='utf8'
    ).cursor()

print 'Loading the synset graph...'
from graph_tool.all import *

g = load_graph('wnen30_noun_tree_longest.graphml.xml.gz')

tree_link = g.edge_properties['tree_link']
pos = g.vertex_properties['pos']

print 'Indexing synsets...'
index = {}
synsetid = g.vertex_properties['synsetid']

for synset in g.vertices():
    index[synsetid[synset]] = synset

print 'Adding a "is_synset" property to distinguish between senses and synsets...'
is_synset = g.new_vertex_property('bool')
g.vertex_properties['is_synset'] = is_synset

for synset in g.vertices():
    is_synset[synset] = 1
    
print 'Adding new properties for sense nodes...'''
lemma = g.new_vertex_property('string')
sensenum = g.new_vertex_property('string')

senseid = g.new_vertex_property('int32_t')
sensekey = g.new_vertex_property('string')

is_core_sense = g.new_vertex_property('bool')

# add sense properties to the graph
g.vertex_properties['lemma'] = lemma
g.vertex_properties['sensenum'] = sensenum
g.vertex_properties['senseid'] = senseid
g.vertex_properties['sensekey'] = sensekey
g.vertex_properties['is_core_sense'] = is_core_sense

print 'Retrieving sense records...'
# for each sense found in the sensekey list with pos=n, create a vertex
c = get_cursor()
c.execute("SELECT * FROM wordsXsensesXsynsets WHERE pos='n' AND sensekey IN ("+','.join(map(lambda x: "'"+x+"'", sensekeys))+")")

senses = {}

print 'Creating core sense vertices...'
for i, row in enumerate(c.fetchall()):
    print 'Core senses: %d\r' % (i+1),
    
    v = g.add_vertex()
    senses[row['senseid']] = v
    
    is_synset[v] = 0
    
    lemma[v] = row['lemma']
    pos[v] = row['pos']
    sensenum[v] = row['sensenum']
    
    senseid[v] = row['senseid']
    sensekey[v] = row['sensekey']
    
    is_core_sense[v] = 1
    
    e = g.add_edge(index[row['synsetid']],v)
    tree_link[e] = 1 # links to senses have to be retained
    
print

print 'Selecting core vertices (senses and synsets)...'
retained = g.new_vertex_property('bool')

# init retained = 0 for all vertices
for v in g.vertices():
    retained[v] = 0
    
# walk up the tangled tree
def walk(v):
    if is_synset[v]:
        retained[v] = 1
    else:
        retained[v] = 0 # discard english word senses
    for parent in v.in_neighbours():
        walk(parent)
        
# starting from each sense vertex
for sense in senses.values():
    walk(sense)
    
g.set_vertex_filter(retained)

print '%d vertices selected.' % len(list(g.vertices()))

# print 'Preparing synsets list...'
# synsets = [v for v in g.vertices() if is_synset[v]]

# print 'Retrieving non-core senses for synsets...'
# c = get_cursor()
# c.execute("SELECT * FROM wordsXsensesXsynsets WHERE pos='n' AND synsetid IN ("+','.join(map(lambda x: "'"+str(synsetid[x])+"'", synsets))+")")

# i = 0
# for row in c.fetchall():
    # if row['senseid'] not in senses:
        # this is a new sense
        # v = g.add_vertex()
        # senses[row['senseid']] = v
        
        # is_synset[v] = 0
        
        # lemma[v] = row['lemma']
        # pos[v] = row['pos']
        # sensenum[v] = row['sensenum']
        
        # senseid[v] = row['senseid']
        # sensekey[v] = row['sensekey']
        
        # is_core_sense[v] = 0
        
        # e = g.add_edge(index[row['synsetid']],v)
        # tree_link[e] = 1 # links to senses have to be retained
        
        # make sure that this vertex will be exported
        # retained[v] = 1
        
        # i += 1
        # print 'Non-core senses: %d\r' % i,
        
print
print 'Saving the graph...'
pruned = Graph(g, prune=True)
pruned.save('wnen30_core_noun_tree_longest_synsets_only.graphml.xml.gz')

#!/usr/share/python
# -*- encoding: utf-8 -*-
#
# Extract synset-word pairs from the Arabic Wordnet
#
# FIXME: Strip diacrtics as suggested my Motaz SAAD

import sys, re
import codecs
import csv
# sudo pip install pyarabic
##import pyarabic.araby  as araby # arabic words general functions


### Change this!
wndata = "/home/bond/work/wns/AWN/"


wnname = "Arabic WordNet (AWN)" 
wnurl = "http://www.globalwordnet.org/AWN/"
wnlang = "arb"
wnlicense = "CC BY SA 3.0"

#
# header
#
outfile = "wn-data-%s.tab" % wnlang
o = codecs.open(outfile, "w", "utf-8" )

o.write("# %s\t%s\t%s\t%s\n" % (wnname, wnlang, wnurl, wnlicense))

### mappings
###
mapdir = "/home/bond/work/wn/mapps/mapping-20-30/"
maps = ["wn20-30.adj", "wn20-30.adv", "wn20-30.noun", "wn20-30.verb"]
pos = {"wn20-30.adj" : "a", "wn20-30.adv" : "r", 
       "wn20-30.noun" : "n", "wn20-30.verb" : "v", }
map2030 = dict();
for m in maps:
    mf = codecs.open(mapdir + m, "r", "utf-8" )
    p = pos[m]
    for l in mf:
        lst = l.strip().split()
        fsfrom = lst[0] + "-" + p
        fsto = sorted([(lst[i+1], lst[i]) for i in range(1,len(lst),2)])[-1][1]
        ##print "%s-%s\t%s-%s" % (fsfrom, p, fsto, p)
        map2030[fsfrom] = "%s-%s" % (fsto, p)
#
# Data is in the files 
# word.csv
# authorshipid,corpus,frequency,synsetid,value,wordid,w_num
# 1,,11,entity_n1EN,entity,entity_1,1
# item.csv
# 
# authorshipid,gloss,headword,itemid,lexfile,name,offset,pos,pwnid,source,type
# 1,that which is perceived or known or inferred to have its own distinct existence (living or nonliving),0,entity_n1EN,0,entity,null,n,100001740,,synset     

id2ss = dict()

synsetReader = csv.reader(open(wndata + 'CSV/item.csv', 'rb'), delimiter=',', quotechar='"')
for row in synsetReader:
    ## only accept PWN synsets and actual IDs
    if row[3]  and row[3].endswith('AR') and len(row[6]) == 9:
        ## print row[3], row[6][1:] + "-" + row[7]
        ## only accept synsets we can map
        ss = row[6][1:] + "-" + row[7]
        if  ss in map2030:
            id2ss[row[3]] = map2030[ss]


wordReader = csv.reader(open(wndata + 'CSV/word.csv', 'rb'), delimiter=',', quotechar='"')
for row in wordReader:
    ## reject English words and only accept PWN synsets we know about
    if row[3] in  id2ss and \
            not re.search(r'^[-A-zA-Z0-9*\'./()]+$', row[4]):
        ##print row[3], row[4]
        lemma = row[4].decode('utf-8')
        ##lemma = araby.stripTashkeel(araby.stripTatweel(row[4].decode('utf-8')))
        synset = id2ss[row[3]]
        o.write("%s\tlemma\t%s\n" % (synset, lemma))

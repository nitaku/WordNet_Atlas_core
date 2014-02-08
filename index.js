
/* GLOBAL SETTINGS, SVG and panels
*/

(function() {
  var global_scale, map, svg, svg_bbox, vis, zoom;

  svg = d3.select('body').append('svg').attr('width', '100%').attr('height', '100%');

  svg_bbox = svg[0][0].getBoundingClientRect();

  /* main visualization (map view from the top)
  */

  global_scale = 0.2;

  vis = svg.append('g');

  map = vis.append('g').attr('transform', "translate(" + (svg_bbox.width / 2) + "," + (svg_bbox.height / 2) + "), scale(" + global_scale + ")");

  /* side map (view from the side)
  */

  /* bottom map (view from the front)
  */

  /* hide the bottom-right corner
  */

  /* ZUI
  */

  /* define a zoom behavior
  */

  zoom = d3.behavior.zoom().scaleExtent([1, 100]).on('zoom', function() {
    /* whenever the user zooms,
    */
    /* modify translation and scale of the zoom group accordingly
    */
    var scale, translation;
    translation = zoom.translate();
    scale = zoom.scale();
    vis.attr('transform', "translate(" + translation + ")scale(" + scale + ")");
    tooltip.attr('transform', "scale(" + (1 / scale) + ")");
    return lod_update(scale);
  });

  /* bind the zoom behavior to the main SVG
  */

  svg.call(zoom);

  /* DATA
  */

  console.debug('Getting data...');

  d3.json('wnen30_core_n_longest.json', function(graph) {
    /* objectify the graph
    */
    /* resolve node IDs (not optimized at all!)
    */
    var LEAF_Z, cells, cells2fontsize, defs, depth2boundary_width, depth_color, hierarchy, l, last_iz, leaf_labels, leaves, n, nodes, old_highlighted_depth, region_labels, regions, scale, tree, whiten, whiteness, _i, _j, _k, _l, _len, _len2, _len3, _len4, _ref, _ref2, _ref3;
    console.debug('Objectifying the graph and constructing the tree...');
    _ref = graph.links;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      _ref2 = graph.nodes;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        n = _ref2[_j];
        if (l.source === n.id) l.source = n;
        if (l.target === n.id) l.target = n;
      }
      /* convert the graph into a tree
      */
      if ((l.is_tree_link != null) && l.is_tree_link) {
        if (!(l.source.children != null)) l.source.children = [];
        l.source.children.push(l.target);
      }
      /* store senses also in a different structure
      */
      if (l.target.type === 'sense') {
        if (!(l.source.senses != null)) l.source.senses = [];
        l.source.senses.push(l.target);
      }
    }
    /* find the root of the tree
    */
    console.debug('Finding the root...');
    _ref3 = graph.nodes;
    for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
      n = _ref3[_k];
      if (n.id === 100001740) tree = n;
    }
    console.debug('Computing d3 hierarchy layout...');
    hierarchy = d3.layout.hierarchy();
    nodes = hierarchy(tree);
    /* sort the senses by sensenum
    */
    console.debug('Sorting senses...');
    for (_l = 0, _len4 = nodes.length; _l < _len4; _l++) {
      n = nodes[_l];
      if (n.type === 'synset') {
        n.senses.sort(function(a, b) {
          return b.sensenum - a.sensenum;
        });
      }
    }
    /* this tree is unordered, we need a canonical ordering for it
    */
    console.debug('Computing canonical sort...');
    tree_utils.canonical_sort(tree);
    /* obtain the sequence of leaves
    */
    leaves = tree_utils.get_leaves(tree);
    /* compute the subtree height for each node
    */
    console.debug('Computing subtrees height...');
    tree_utils.compute_height(tree);
    /* VISUALIZATION
    */
    /* compute the space-filling curve layout
    */
    console.debug('Computing the Space-Filling Curve layout...');
    scale = 26;
    sfc_layout.displace(leaves, sfc_layout.HILBERT, scale, scale * 1 / Math.sqrt(3), Math.PI / 4);
    /* compute also the position of internal nodes
    */
    console.debug('Computing the position of internal nodes...');
    sfc_layout.displace_tree(tree);
    /* define a bundle layout
    */
    /* group leaves by depth
    */
    console.debug('Almost ready to draw...');
    /* define a color scale for leaf depth
    */
    whiteness = 0.4;
    whiten = function(color) {
      return d3.interpolateHcl(color, d3.hcl(void 0, 0, 100))(whiteness);
    };
    depth_color = d3.scale.linear().domain([
      1, d3.max(leaves, function(d) {
        return d.depth;
      })
    ]).range(['#AEFCA1', '#605D75'].map(whiten)).interpolate(d3.interpolateHcl);
    /* define a thickness scale for region height
    */
    /* translate size to cell scale
    */
    console.debug('Computing the jigsaw treemap...');
    /* compute all the internal nodes regions
    */
    jigsaw.treemap(tree, scale, jigsaw.ISO_CELL);
    console.debug('Drawing...');
    /* define the level zero region (the land)
    */
    defs = svg.append('defs');
    /* faux land glow (using filters takes too much resources)
    */
    /* draw the cells
    */
    cells = map.selectAll('.cell').data(leaves).enter().append('path').attr('class', 'cell').attr('d', jigsaw.iso_generate_svg_path(scale)).attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }).attr('fill', function(d) {
      return depth_color(d.depth);
    }).on('mouseenter', function(d) {
      tooltip_g.attr('transform', "translate(" + d.x + "," + (d.y - scale * 0.5) + ")");
      return tooltip.text("" + d.lemma);
    }).on('mouseleave', function() {
      return tooltip.text('');
    });
    /* draw boundaries
    */
    depth2boundary_width = function(x) {
      return (20 - 0.2) / Math.pow(2, x) + 0.2;
    };
    old_highlighted_depth = null;
    regions = map.selectAll('.region').data(nodes.filter(function(d) {
      return d.type === 'synset';
    }).sort(function(a, b) {
      return b.depth - a.depth;
    })).enter().append('path').attr('class', 'region').attr('d', function(d) {
      return jigsaw.get_svg_path(d.region);
    }).attr('stroke-width', function(d) {
      if (d.depth === 0) {
        return depth2boundary_width(d.depth + 1);
      } else {
        return depth2boundary_width(d.depth);
      }
    }).attr('stroke', 'white').on('click', function(d) {
      if (!(old_highlighted_depth != null) || old_highlighted_depth !== d.depth) {
        regions.filter(function(r) {
          return r.depth <= d.depth;
        }).attr('stroke', '#444');
        regions.filter(function(r) {
          return r.depth > d.depth;
        }).attr('stroke', 'white');
        return old_highlighted_depth = d.depth;
      } else {
        regions.attr('stroke', 'white');
        return old_highlighted_depth = null;
      }
    });
    /* draw the land border (above cells and boundaries)
    */
    /* draw the graph links
    */
    /* draw the graph links
    */
    /* draw region labels
    */
    cells2fontsize = d3.scale.pow().exponent(0.4).domain([1, leaves.length]).range([2, 150]);
    region_labels = map.selectAll('.region_label').data(nodes.filter(function(d) {
      return d.type === 'synset';
    })).enter().append('text').attr('class', 'region_label').attr('font-size', function(d) {
      return cells2fontsize(d.leaf_descendants.length);
    }).attr('dy', '0.35em').attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + "), scale(1, " + (1 / Math.sqrt(3)) + "), rotate(45)";
    }).text(function(d) {
      return d.senses[0].lemma;
    });
    /* draw the leaf labels
    */
    leaf_labels = map.selectAll('.leaf_label').data(leaves).enter().append('text').attr('class', 'leaf_label').attr('font-size', function(d) {
      if (d.is_core) {
        return 3.5;
      } else {
        return 2.5;
      }
    }).attr('dy', '0.35em').attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }).text(function(d) {
      return "" + d.lemma;
    }).attr('font-weight', function(d) {
      if (d.is_core) {
        return 'bold';
      } else {
        return 'normal';
      }
    }).attr('display', 'none');
    /* ORTHOGONAL PROJECTIONS
    */
    /* FIXME define a width scale for leaf depth
    */
    /* capitals
    */
    /* TOOLTIP
    */
    this.tooltip_g = map.append('g');
    this.tooltip = tooltip_g.append('text').attr('class', 'tooltip').attr('dy', '-0.35em').attr('font-size', 16 / global_scale);
    /* LOD
    */
    /* update Level Of Detail
    */
    last_iz = -1;
    LEAF_Z = 13;
    this.lod_update = function(z) {
      var Z_LEVELS, iz;
      Z_LEVELS = tree.height - 2;
      iz = Math.floor(Z_LEVELS * z / (LEAF_Z - 1));
      if (iz !== last_iz) {
        regions.attr('display', function(d) {
          if (d.depth <= iz) {
            return 'inline';
          } else {
            return 'none';
          }
        });
        region_labels.attr('display', function(d) {
          if (d.depth <= iz) {
            return 'inline';
          } else {
            return 'none';
          }
        }).attr('fill-opacity', function(d) {
          if (d.depth === iz) {
            return 0.5;
          } else if (d.height === 2) {
            return 0.5;
          } else {
            return 0.1;
          }
        });
        if (z >= LEAF_Z) {
          region_labels.attr('fill-opacity', 0.1);
          leaf_labels.attr('display', 'inline');
          tooltip.attr('display', 'none');
        } else {
          region_labels.attr('fill-opacity', function(d) {
            if (d.depth === iz) {
              return 0.5;
            } else if (d.height === 2) {
              return 0.5;
            } else {
              return 0.1;
            }
          });
          leaf_labels.attr('display', 'none');
          tooltip.attr('display', 'inline');
        }
        return last_iz = iz;
      }
    };
    return lod_update(1);
  });

}).call(this);

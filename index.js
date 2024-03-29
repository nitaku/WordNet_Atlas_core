
/* GLOBAL SETTINGS, SVG and panels
*/

(function() {
  var app_url, global_scale, lang, map, svg, svg_bbox, url, vis, zoom;

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

  zoom = d3.behavior.zoom().scaleExtent([0.5, 100]).on('zoom', function() {
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

  app_url = String(document.URL).split('#');

  lang = app_url[app_url.length - 1];

  if (lang.length !== 3) {
    url = 'wnen30_core_n_longest.json';
    console.debug('Getting data for English...');
  } else {
    url = "multilingual/wnen30_core_n_longest_" + lang + ".json";
    console.debug("Getting data for " + lang + "...");
  }

  d3.json(url, function(graph) {
    /* objectify the graph
    */
    var LABEL_SCALE, LEAF_Z, capital_placement, cells, cells_g, depth, depth2width, depth_color, hierarchy, index, l, last_iz, leaf_labels_g, leaves, levels, n, node, nodes, old_highlighted_depth, region_labels_g, region_labels_levels, regions_g, regions_levels, scale, translation, tree, whiten, whiteness, _i, _j, _k, _l, _len, _len2, _len3, _len4, _ref, _ref2, _ref3;
    console.debug('Indexing nodes...');
    index = {};
    _ref = graph.nodes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      index[n.id] = n;
      if (n.type === 'synset') n.senses = [];
    }
    console.debug('Objectifying the graph and constructing the tree...');
    /* resolve node IDs
    */
    _ref2 = graph.links;
    for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
      l = _ref2[_j];
      l.source = index[l.source];
      l.target = index[l.target];
      /* convert the graph into a tree
      */
      if ((l.is_tree_link != null) && l.is_tree_link) {
        if (!(l.source.children != null)) l.source.children = [];
        l.source.children.push(l.target);
      }
      /* store senses also in a different structure
      */
      if (l.target.type === 'sense') l.source.senses.push(l.target);
    }
    /* find the root of the tree
    */
    console.debug('Finding the root...');
    tree = index[100001740];
    console.debug('Computing d3 hierarchy layout...');
    hierarchy = d3.layout.hierarchy();
    nodes = hierarchy(tree);
    /* sort the senses FIXME this is not a good ordering - we should get the tagcount column
    */
    console.debug('Sorting senses...');
    for (_k = 0, _len3 = nodes.length; _k < _len3; _k++) {
      n = nodes[_k];
      if (n.type === 'synset') {
        n.senses.sort(function(a, b) {
          return a.id - b.id;
        });
      }
    }
    /* this tree is unordered, we need a canonical ordering for it
    */
    console.debug('Computing canonical sort...');
    tree_utils.canonical_sort(tree);
    console.debug('Computing leaf descendants...');
    tree_utils.compute_leaf_descendants(tree);
    /* compute the subtree height for each node
    */
    console.debug('Computing subtrees height...');
    tree_utils.compute_height(tree);
    console.debug('Placing capitals in the middle of their region...');
    capital_placement = function(node) {
      /* skip leaf synsets
      */
      var child, cut, cut_dist, dist, i, left, left_size, m, right, right_size, _l, _len4, _ref3, _ref4, _results;
      if (node.height <= 2) return;
      /* place the sense nodes about into the middle of the children array
      */
      node.children = node.children.filter(function(d) {
        return d.type === 'synset';
      });
      m = d3.sum(node.children, function(d) {
        return d.leaf_descendants.length;
      }) / 2;
      cut = null;
      cut_dist = m;
      for (i = 0, _ref3 = node.children.length; 0 <= _ref3 ? i < _ref3 : i > _ref3; 0 <= _ref3 ? i++ : i--) {
        left = node.children.slice(0, i);
        right = node.children.slice(i);
        left_size = d3.sum(left, function(d) {
          return d.leaf_descendants.length;
        });
        right_size = d3.sum(left, function(d) {
          return d.leaf_descendants.length;
        });
        dist = Math.min(Math.abs(m - left_size), Math.abs(m - right_size));
        if (dist < cut_dist) {
          cut_dist = dist;
          cut = i;
        }
      }
      node.children = node.children.slice(0, cut).concat(node.senses.concat(node.children.slice(cut)));
      /* recur
      */
      _ref4 = node.children;
      _results = [];
      for (_l = 0, _len4 = _ref4.length; _l < _len4; _l++) {
        child = _ref4[_l];
        _results.push(capital_placement(child));
      }
      return _results;
    };
    capital_placement(tree);
    /* obtain the sequence of leaves
    */
    leaves = tree_utils.get_leaves(tree);
    /* VISUALIZATION
    */
    /* compute the space-filling curve layout
    */
    console.debug('Computing the Space-Filling Curve layout...');
    scale = 26;
    translation = sfc_layout.displace(leaves, sfc_layout.HILBERT, scale, scale * 1 / Math.sqrt(3), Math.PI / 4);
    /* compute also the position of internal nodes
    */
    console.debug('Computing the position of internal nodes...');
    sfc_layout.displace_tree(tree);
    /* define a bundle layout
    */
    /* group leaves by depth
    */
    console.debug('Grouping nodes by depth...');
    levels = [];
    for (depth = 0, _ref3 = tree.height; 0 <= _ref3 ? depth <= _ref3 : depth >= _ref3; 0 <= _ref3 ? depth++ : depth--) {
      levels.push([]);
    }
    for (_l = 0, _len4 = nodes.length; _l < _len4; _l++) {
      node = nodes[_l];
      levels[node.depth].push(node);
    }
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
    console.debug('Computing label placement...');
    jigsaw.hilbert_labels(tree, scale, translation);
    console.debug('Drawing...');
    /* define the level zero region (the land)
    */
    /* faux land glow (using filters takes too much resources)
    */
    /* draw the land border (below cells and boundaries)
    */
    /* draw the cells
    */
    cells_g = map.append('g');
    cells = cells_g.selectAll('.cell').data(leaves).enter().append('path').attr('class', 'cell').attr('d', jigsaw.iso_generate_svg_path(scale)).attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }).attr('fill', function(d) {
      return depth_color(d.depth);
    }).on('mouseenter', function(d) {
      if (d3.event.defaultPrevented) return;
      tooltip_g.attr('transform', "translate(" + d.x + "," + (d.y - scale * 0.5) + ")");
      return tooltip.text("" + (d.lemma != null ? d.lemma : '?'));
    }).on('mouseleave', function() {
      return tooltip.text('');
    });
    /* draw boundaries
    */
    depth2width = function(x) {
      return (20 - 0.2) / Math.pow(2, x) + 0.2;
    };
    old_highlighted_depth = null;
    regions_g = map.append('g');
    regions_levels = regions_g.selectAll('.level').data(levels).enter().append('g').attr('class', 'level');
    regions_levels.selectAll('.region').data(function(level) {
      return level.filter(function(d) {
        return d.type === 'synset';
      });
    }).enter().append('path').attr('class', 'region').attr('d', function(d) {
      return jigsaw.get_svg_path(d.region);
    }).attr('stroke-width', function(d) {
      if (d.depth === 0) {
        return depth2width(d.depth + 1);
      } else {
        return depth2width(d.depth);
      }
    }).attr('stroke', 'white').on('click', function(d) {
      if (d3.event.defaultPrevented) return;
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
    /* draw the graph links
    */
    /* draw the graph links
    */
    /* draw region labels
    */
    LABEL_SCALE = 0.6;
    region_labels_g = map.append('g').attr('transform', "translate(" + translation.dx + "," + translation.dy + "), scale(1, " + (1 / Math.sqrt(3)) + "), rotate(45)");
    region_labels_levels = region_labels_g.selectAll('.level').data(levels).enter().append('g').attr('class', 'level');
    region_labels_levels.selectAll('.region_label').data(function(level) {
      return level.filter(function(d) {
        return d.type === 'synset';
      });
    }).enter().append('text').attr('class', 'region_label').classed('leaf_synset', function(d) {
      return d.height === 2;
    }).attr('dy', '0.35em').text(function(d) {
      if (d.senses.length > 0) {
        return d.senses[0].lemma;
      } else {
        return '?';
      }
    }).attr('transform', function(d) {
      var bbox, bbox_aspect, h_ratio, lbbox, lbbox_aspect, lbbox_height, lbbox_width, ratio, rotate, w_ratio;
      bbox = this.getBBox();
      bbox_aspect = bbox.width / bbox.height;
      lbbox = d.label_bbox;
      lbbox_aspect = lbbox.width / lbbox.height;
      rotate = bbox_aspect >= 1 && lbbox_aspect < 1 || bbox_aspect < 1 && lbbox_aspect >= 1;
      if (rotate) {
        lbbox_width = lbbox.height;
        lbbox_height = lbbox.width;
      } else {
        lbbox_width = lbbox.width;
        lbbox_height = lbbox.height;
      }
      w_ratio = lbbox_width / bbox.width;
      h_ratio = lbbox_height / bbox.height;
      ratio = Math.min(w_ratio, h_ratio) * LABEL_SCALE;
      return "translate(" + (d.label_bbox.x + d.label_bbox.width / 2) + "," + (d.label_bbox.y + d.label_bbox.height / 2) + "),scale(" + ratio + "),rotate(" + (rotate ? -90 : 0) + ")";
    });
    /* draw the leaf labels
    */
    leaf_labels_g = map.append('g');
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
        regions_levels.attr('display', function(d, i) {
          if (i <= iz) {
            return 'inline';
          } else {
            return 'none';
          }
        });
        region_labels_levels.attr('display', function(d, i) {
          if (i <= iz) {
            return 'inline';
          } else {
            return 'none';
          }
        }).attr('fill-opacity', function(d, i) {
          if (i === iz) {
            return 0.5;
          } else {
            return 0.1;
          }
        });
        if (z >= LEAF_Z) {
          region_labels_g.attr('opacity', 0.2);
          tooltip.attr('display', 'none');
          leaf_labels_g.selectAll('.leaf_label').data(leaves).enter().append('text').attr('class', 'leaf_label').attr('font-size', function(d) {
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
          });
        } else {
          region_labels_g.attr('opacity', 1);
          tooltip.attr('display', 'inline');
          leaf_labels_g.selectAll('.leaf_label').data([]).exit().remove();
        }
        return last_iz = iz;
      }
    };
    return lod_update(1);
  });

}).call(this);

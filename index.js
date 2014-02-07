
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

  map = vis.append('g').attr('transform', "translate(" + (svg_bbox.width / 2) + "," + (svg_bbox.height / 2) + "), scale(" + global_scale + "), scale(1,0.5), rotate(45)");

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
    var cells, cells2fontsize, defs, depth_color, hierarchy, l, leaf_labels, leaves, n, nodes, projs, regions, scale, tree, whiten, whiteness, _i, _j, _k, _l, _len, _len2, _len3, _len4, _ref, _ref2, _ref3;
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
    sfc_layout.displace(leaves, sfc_layout.HILBERT, scale, 0);
    /* compute also the position of internal nodes
    */
    console.debug('Computing the position of internal nodes...');
    sfc_layout.displace_tree(tree);
    /* define a bundle layout
    */
    /* group leaves by depth
    */
    console.debug('Computing the orthogonal projections for depthmaps...');
    projs = {
      front: orthoproj.depth_projs(leaves, 'x'),
      side: orthoproj.depth_projs(leaves, 'y')
    };
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
    /* translate cells to label font size
    */
    cells2fontsize = d3.scale.pow().exponent(0.4).domain([1, leaves.length]).range([4, 200]);
    /* compute all the internal nodes regions
    */
    jigsaw.treemap(tree, scale, jigsaw.SQUARE_CELL);
    /* define the level zero region (the land)
    */
    defs = svg.append('defs');
    defs.append('path').attr('id', 'land').attr('d', jigsaw.get_svg_path(tree.region));
    /* faux land glow (using filters takes too much resources)
    */
    map.append('use').attr('class', 'land-glow-outer').attr('xlink:href', '#land');
    map.append('use').attr('class', 'land-glow-inner').attr('xlink:href', '#land');
    /* draw the cells
    */
    cells = map.selectAll('.cell').data(leaves).enter().append('rect').attr('class', 'cell').attr('x', function(d) {
      return d.x - scale / 2;
    }).attr('y', function(d) {
      return d.y - scale / 2;
    }).attr('width', scale).attr('height', scale).attr('fill', function(d) {
      return depth_color(d.depth);
    });
    /* draw boundaries
    */
    regions = map.selectAll('.region').data(nodes.filter(function(d) {
      return d.type === 'synset';
    })).enter().append('path').attr('class', 'region').attr('d', function(d) {
      return jigsaw.get_svg_path(d.region);
    });
    /* draw the land border (above cells and boundaries)
    */
    map.append('use').attr('class', 'land-fill').attr('xlink:href', '#land');
    /* draw the graph links
    */
    /* draw the graph links
    */
    /* draw labels
    */
    /* draw the leaf labels
    */
    leaf_labels = map.selectAll('.leaf_label').data(leaves).enter().append('text').attr('class', 'leaf_label').attr('font-size', function(d) {
      if (d.is_core) {
        return 3.5;
      } else {
        return 2.5;
      }
    }).attr('dy', '0.35em').attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + "), rotate(-45), scale(1,2)";
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
    /* LOD
    */
    /* update Level Of Detail
    */
    this.lod_update = function(z) {
      var iz;
      iz = Math.floor(z);
      if (iz % 2 === 1) {
        regions.attr('display', function(d) {
          if (d.leaf_descendants.length * z * z * z > 5000) {
            return 'inline';
          } else {
            return 'none';
          }
        });
        if (z > 20) {
          return leaf_labels.attr('display', 'inline');
        } else {
          return leaf_labels.attr('display', 'none');
        }
      }
    };
    return lod_update(1);
  });

}).call(this);

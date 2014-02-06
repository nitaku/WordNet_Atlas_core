
/* GLOBAL SETTINGS, SVG and panels
*/

(function() {
  var bottom, bottom_height, bottom_map, global_scale, height, map, side, side_map, side_width, svg, vis, width, zoom;

  width = 960;

  height = 620;

  side_width = 80;

  bottom_height = 80;

  svg = d3.select('body').append('svg').attr('width', width).attr('height', height);

  /* main visualization (map view from the top)
  */

  global_scale = 0.1;

  vis = svg.append('g');

  map = vis.append('g').attr('transform', "translate(" + ((width - side_width) / 2) + "," + ((height - bottom_height) / 2) + "), scale(" + global_scale + ")");

  /* side map (view from the side)
  */

  svg.append('rect').attr('class', 'panel').attr('width', side_width).attr('height', height).attr('transform', "translate(" + (width - side_width) + ",0)");

  side = svg.append('g');

  side_map = side.append('g').attr('transform', "translate(" + (width - side_width) + "," + ((height - bottom_height) / 2) + "), scale(1," + global_scale + ")");

  /* bottom map (view from the front)
  */

  svg.append('rect').attr('class', 'panel').attr('width', width).attr('height', bottom_height).attr('transform', "translate(0," + (height - bottom_height) + ")");

  bottom = svg.append('g');

  bottom_map = bottom.append('g').attr('transform', "translate(" + ((width - side_width) / 2) + "," + (height - bottom_height) + "), scale(" + global_scale + ",1)");

  /* hide the bottom-right corner
  */

  svg.append('rect').attr('x', width - side_width).attr('y', height - bottom_height).attr('width', side_width).attr('height', bottom_height).attr('fill', 'white');

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
    side.attr('transform', "translate(0, " + translation[1] + ")scale(1," + (zoom.scale()) + ")");
    bottom.attr('transform', "translate(" + translation[0] + ", 0)scale(" + (zoom.scale()) + ",1)");
    return lod_update(scale);
  });

  /* bind the zoom behavior to the main SVG
  */

  svg.call(zoom);

  /* DATA
  */

  d3.json('wnen30_core_n_longest.json', function(graph) {
    /* objectify the graph
    */
    /* resolve node IDs (not optimized at all!)
    */
    var cells, cells2fontsize, defs, depth_color, front_range, front_step, hierarchy, l, last_z, leaf_labels, leaves, margin, n, nodes, projs, scale, side_range, side_step, tree, whiten, whiteness, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
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
    }
    /* find the root of the tree
    */
    _ref3 = graph.nodes;
    for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
      n = _ref3[_k];
      if (n.id === 100001740) tree = n;
    }
    hierarchy = d3.layout.hierarchy();
    nodes = hierarchy(tree);
    /* this tree is unordered, we need a canonical ordering for it
    */
    tree_utils.canonical_sort(tree);
    /* obtain the sequence of leaves
    */
    leaves = tree_utils.get_leaves(tree);
    /* compute the subtree height for each node
    */
    tree_utils.compute_height(tree);
    /* VISUALIZATION
    */
    /* compute the space-filling curve layout
    */
    scale = 26;
    sfc_layout.displace(leaves, sfc_layout.HILBERT, scale, 0);
    /* compute also the position of internal nodes
    */
    sfc_layout.displace_tree(tree);
    /* define a bundle layout
    */
    /* group leaves by depth
    */
    projs = {
      front: orthoproj.depth_projs(leaves, 'x'),
      side: orthoproj.depth_projs(leaves, 'y')
    };
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
    cells2fontsize = d3.scale.pow().exponent(0.3).domain([1, leaves.length]).range([4, 80]);
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
    cells = map.selectAll('.cell').data(leaves).enter().append('path').attr('class', 'cell').attr('d', jigsaw.square_generate_svg_path(scale)).attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }).attr('fill', function(d) {
      return depth_color(d.depth);
    });
    /* draw the land border (above cells)
    */
    map.append('use').attr('class', 'land-fill').attr('xlink:href', '#land');
    /* draw boundaries
    */
    map.selectAll('.region').data(nodes.filter(function(d) {
      var _ref4;
      return (_ref4 = d.depth) === 1 || _ref4 === 2;
    }).reverse()).enter().append('path').attr('class', 'region').attr('d', function(d) {
      return jigsaw.get_svg_path(d.region);
    }).attr('stroke', function(d) {
      if (d.depth === 1) {
        return '#444';
      } else {
        return '#999';
      }
    }).attr('stroke-width', function(d) {
      if (d.depth === 1) {
        return '2px';
      } else {
        return '1px';
      }
    });
    /* draw the graph links
    */
    /* draw the graph links
    */
    /* draw labels
    */
    /* draw the leaf labels
    */
    leaf_labels = map.selectAll('.leaf_label').data(leaves).enter().append('text').attr('class', 'leaf_label').attr('font-size', '2.5').attr('dy', '0.35em').attr('transform', function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }).text(function(d) {
      return "" + d.lemma + " [" + d.sensenum + "] " + d.pos + ".";
    }).attr('font-weight', function(d) {
      if (d.is_core) {
        return 'bold';
      } else {
        return 'normal';
      }
    });
    /* ORTHOGONAL PROJECTIONS
    */
    /* FIXME define a width scale for leaf depth
    */
    margin = 8;
    side_range = side_width - margin * 2;
    side_step = side_range / (tree.height - 1);
    side_map.selectAll('.proj_node').data(projs.side).enter().append('rect').attr('class', 'proj_node').attr('x', function(d) {
      return margin + side_range * (d.depth - 1) / (tree.height - 1);
    }).attr('y', function(d) {
      return d.y - scale / 2;
    }).attr('width', side_step).attr('height', scale).attr('fill', function(d) {
      return depth_color(d.depth);
    }).attr('stroke', function(d) {
      return depth_color(d.depth);
    });
    front_range = bottom_height - margin * 2;
    front_step = front_range / (tree.height - 1);
    bottom_map.selectAll('.proj_node').data(projs.front).enter().append('rect').attr('class', 'proj_node').attr('x', function(d) {
      return d.x - scale / 2;
    }).attr('y', function(d) {
      return margin + front_range * (d.depth - 1) / (tree.height - 1);
    }).attr('width', scale).attr('height', front_step).attr('fill', function(d) {
      return depth_color(d.depth);
    }).attr('stroke', function(d) {
      return depth_color(d.depth);
    });
    /* LOD
    */
    /* update Level Of Detail
    */
    last_z = 1;
    this.lod_update = function(z) {
      if (z >= 18 && last_z < 18) leaf_labels.attr('display', 'inline');
      if (z === 1 || (z < 18 && last_z >= 18)) leaf_labels.attr('display', 'none');
      return last_z = z;
    };
    return lod_update(last_z);
  });

}).call(this);

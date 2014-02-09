(function() {

  window.jigsaw = {
    hex_generate_svg_path: function(scale) {
      var a, r;
      a = scale / 2;
      r = a / Math.sin(Math.PI / 3);
      return "M" + r + " 0 L" + (r / 2) + " " + a + " L" + (-r / 2) + " " + a + " L" + (-r) + " 0 L" + (-r / 2) + " " + (-a) + " L" + (r / 2) + " " + (-a) + " Z";
    },
    square_generate_svg_path: function(scale) {
      var a;
      a = scale / 2;
      return "M" + (-a) + " " + (-a) + " L" + (-a) + " " + a + " L" + a + " " + a + " L" + a + " " + (-a) + " Z";
    },
    iso_generate_svg_path: function(scale) {
      var rx, ry;
      rx = scale * Math.sqrt(2) / 2;
      ry = scale * Math.sqrt(2) / (2 * Math.sqrt(3));
      return "M" + 0 + " " + (-ry) + " L" + rx + " " + 0 + " L" + 0 + " " + ry + " L" + (-rx) + " " + 0 + " Z";
    },
    HEX_CELL: function(node, scale) {
      var a, r, region;
      a = scale / 2;
      r = a / Math.sin(Math.PI / 3);
      region = [
        [
          {
            X: node.x + r,
            Y: node.y
          }, {
            X: node.x + r / 2,
            Y: node.y + a
          }, {
            X: node.x - r / 2,
            Y: node.y + a
          }, {
            X: node.x - r,
            Y: node.y
          }, {
            X: node.x - r / 2,
            Y: node.y - a
          }, {
            X: node.x + r / 2,
            Y: node.y - a
          }
        ]
      ];
      return region;
    },
    SQUARE_CELL: function(node, scale) {
      var a, region;
      a = scale / 2;
      region = [
        [
          {
            X: node.x - a,
            Y: node.y - a
          }, {
            X: node.x - a,
            Y: node.y + a
          }, {
            X: node.x + a,
            Y: node.y + a
          }, {
            X: node.x + a,
            Y: node.y - a
          }
        ]
      ];
      return region;
    },
    ISO_CELL: function(node, scale) {
      var region, rx, ry;
      rx = scale * Math.sqrt(2) / 2;
      ry = scale * Math.sqrt(2) / (2 * Math.sqrt(3));
      return region = [
        [
          {
            X: node.x,
            Y: node.y - ry
          }, {
            X: node.x + rx,
            Y: node.y
          }, {
            X: node.x,
            Y: node.y + ry
          }, {
            X: node.x - rx,
            Y: node.y
          }
        ]
      ];
    },
    treemap: function(node, scale, base) {
      var child, children_paths, cpr, upscale, _i, _len, _ref;
      if (!(node.children != null)) {
        node.region = base(node, scale);
        return node.region;
      }
      _ref = node.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        jigsaw.treemap(child, scale, base);
      }
      children_paths = node.children.map(function(d) {
        return d.region;
      }).reduce(function(a, d) {
        return a.concat(d);
      });
      upscale = 1000;
      ClipperLib.JS.ScaleUpPaths(children_paths, upscale);
      cpr = new ClipperLib.Clipper();
      cpr.AddPaths(children_paths, ClipperLib.PolyType.ptSubject, true);
      node.region = new ClipperLib.Paths();
      cpr.Execute(ClipperLib.ClipType.ctUnion, node.region, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
      ClipperLib.JS.ScaleDownPaths(children_paths, upscale);
      return ClipperLib.JS.ScaleDownPaths(node.region, upscale);
    },
    /* Converts Paths to SVG path string
    */
    /* and scales down the coordinates
    */
    /* from http://jsclipper.sourceforge.net/6.1.3.1/index.html?p=starter_boolean.html
    */
    get_svg_path: function(paths, scale) {
      var i, p, path, svgpath, _i, _len, _len2;
      svgpath = '';
      if (!(scale != null)) scale = 1;
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        path = paths[_i];
        for (i = 0, _len2 = path.length; i < _len2; i++) {
          p = path[i];
          if (i === 0) {
            svgpath += 'M';
          } else {
            svgpath += 'L';
          }
          svgpath += p.X / scale + ", " + p.Y / scale;
        }
        svgpath += 'Z';
      }
      if (svgpath === '') svgpath = 'M0,0';
      return svgpath;
    },
    hilbert_labels: function(node, scale) {
      /* create a sort of bitmap of this node's cells
      */
      var box, boxes, cell, child, grow, ix, ixg, iy, iyg, last_box, matrix, max_area, max_ix, max_iy, max_x, max_y, min_ix, min_iy, min_x, min_y, original_area, x_boxes, y_boxes, _i, _j, _k, _l, _len, _len2, _len3, _len4, _ref, _ref2, _ref3, _ref4, _ref5, _ref6, _results;
      matrix = {};
      _ref = node.leaf_descendants;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        if (!(cell.ix in matrix)) matrix[cell.ix] = {};
        matrix[cell.ix][cell.iy] = cell;
      }
      /* compute the matrix boundaries
      */
      min_ix = d3.min(node.leaf_descendants, function(d) {
        return d.ix;
      });
      max_ix = d3.max(node.leaf_descendants, function(d) {
        return d.ix;
      });
      min_iy = d3.min(node.leaf_descendants, function(d) {
        return d.iy;
      });
      max_iy = d3.max(node.leaf_descendants, function(d) {
        return d.iy;
      });
      /* scan X to create tall boxes
      */
      x_boxes = [];
      for (ix = min_ix; min_ix <= max_ix ? ix <= max_ix : ix >= max_ix; min_ix <= max_ix ? ix++ : ix--) {
        x_boxes.push({});
        for (iy = min_iy; min_iy <= max_iy ? iy <= max_iy : iy >= max_iy; min_iy <= max_iy ? iy++ : iy--) {
          last_box = x_boxes[x_boxes.length - 1];
          if (ix in matrix && iy in matrix[ix]) {
            if (!('topleft' in last_box)) {
              last_box.bottomright = last_box.topleft = matrix[ix][iy];
              last_box.area = 1;
            } else {
              last_box.bottomright = matrix[ix][iy];
              last_box.area += 1;
            }
          } else if ('topleft' in last_box) {
            x_boxes.push({});
          }
        }
      }
      /* scan Y to create wide boxes
      */
      y_boxes = [];
      for (iy = min_iy; min_iy <= max_iy ? iy <= max_iy : iy >= max_iy; min_iy <= max_iy ? iy++ : iy--) {
        y_boxes.push({});
        for (ix = min_ix; min_ix <= max_ix ? ix <= max_ix : ix >= max_ix; min_ix <= max_ix ? ix++ : ix--) {
          last_box = y_boxes[y_boxes.length - 1];
          if (ix in matrix && iy in matrix[ix]) {
            if (!('topleft' in last_box)) {
              last_box.topleft = matrix[ix][iy];
              last_box.bottomright = matrix[ix][iy];
              last_box.area = 1;
            } else {
              last_box.bottomright = matrix[ix][iy];
              last_box.area += 1;
            }
          } else if ('topleft' in last_box) {
            y_boxes.push({});
          }
        }
      }
      /* grow boxes along X
      */
      for (_j = 0, _len2 = x_boxes.length; _j < _len2; _j++) {
        box = x_boxes[_j];
        if (!(box.topleft != null)) continue;
        grow = true;
        original_area = box.area;
        while (grow) {
          ixg = box.bottomright.ix + 1;
          for (iyg = _ref2 = box.topleft.iy, _ref3 = box.bottomright.iy; _ref2 <= _ref3 ? iyg <= _ref3 : iyg >= _ref3; _ref2 <= _ref3 ? iyg++ : iyg--) {
            grow = ixg in matrix && iyg in matrix[ixg];
            if (!grow) break;
          }
          if (grow) {
            box.bottomright = matrix[ixg][box.bottomright.iy];
            box.area += original_area;
          }
        }
      }
      /* grow boxes along Y
      */
      for (_k = 0, _len3 = y_boxes.length; _k < _len3; _k++) {
        box = y_boxes[_k];
        if (!(box.topleft != null)) continue;
        grow = true;
        original_area = box.area;
        while (grow) {
          iyg = box.bottomright.iy + 1;
          for (ixg = _ref4 = box.topleft.ix, _ref5 = box.bottomright.ix; _ref4 <= _ref5 ? ixg <= _ref5 : ixg >= _ref5; _ref4 <= _ref5 ? ixg++ : ixg--) {
            grow = ixg in matrix && iyg in matrix[ixg];
            if (!grow) break;
          }
          if (grow) {
            box.bottomright = matrix[box.bottomright.ix][iyg];
            box.area += original_area;
          }
        }
      }
      /* select the biggest box
      */
      boxes = x_boxes.concat(y_boxes);
      max_area = d3.max(boxes, function(b) {
        return b.area;
      });
      box = boxes.filter(function(d) {
        return d.area === max_area;
      })[0];
      /* convert into x,y coordinates
      */
      min_x = box.topleft.ix * scale - scale / 2;
      max_x = box.bottomright.ix * scale + scale / 2;
      min_y = box.topleft.iy * scale - scale / 2;
      max_y = box.bottomright.iy * scale + scale / 2;
      node.label_bbox = {
        x: min_x,
        y: min_y,
        width: max_x - min_x,
        height: max_y - min_y
      };
      if (node.children != null) {
        _ref6 = node.children;
        _results = [];
        for (_l = 0, _len4 = _ref6.length; _l < _len4; _l++) {
          child = _ref6[_l];
          _results.push(jigsaw.hilbert_labels(child, scale));
        }
        return _results;
      }
    }
  };

}).call(this);

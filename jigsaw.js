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
    treemap: function(node, scale, base) {
      var child, children_paths, cpr, upscale;
      if (!(node.children != null)) {
        node.region = base(node, scale);
        return node.region;
      }
      children_paths = ((function() {
        var _i, _len, _ref, _results;
        _ref = node.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          _results.push(jigsaw.treemap(child, scale, base));
        }
        return _results;
      })()).reduce(function(a, d) {
        return a.concat(d);
      });
      upscale = 100;
      ClipperLib.JS.ScaleUpPaths(children_paths, upscale);
      cpr = new ClipperLib.Clipper();
      cpr.AddPaths(children_paths, ClipperLib.PolyType.ptSubject, true);
      node.region = new ClipperLib.Paths();
      cpr.Execute(ClipperLib.ClipType.ctUnion, node.region, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
      ClipperLib.JS.ScaleDownPaths(children_paths, upscale);
      ClipperLib.JS.ScaleDownPaths(node.region, upscale);
      return node.region;
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
    }
  };

}).call(this);

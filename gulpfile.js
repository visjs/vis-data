var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var rename = require("gulp-rename");
var webpack = require('webpack');
var uglify = require('uglify-js');
var rimraf = require('rimraf');
var merge = require('merge-stream');
var argv = require('yargs').argv;

var ENTRY             = './index.js';
var HEADER            = './lib/header.js';
var DIST              = './dist';
var VIS_JS            = 'vis.js';
var VIS_MAP           = 'vis.map';
var VIS_MIN_JS        = 'vis.min.js';
var VIS_LIGHT_JS      = 'vis-light.js';
var VIS_LIGHT_MAP     = 'vis-light.map';
var VIS_LIGHT_MIN_JS  = 'vis-light.min.js';
var VIS_CSS           = 'vis.css';
var VIS_MIN_CSS       = 'vis.min.css';

// generate banner with today's date and correct version
function createBanner() {
  var today = gutil.date(new Date(), 'yyyy-mm-dd'); // today, formatted as yyyy-mm-dd
  var version = require('./package.json').version;

  return String(fs.readFileSync(HEADER))
      .replace('@@date', today)
      .replace('@@version', version);
}

var bannerPlugin = new webpack.BannerPlugin(createBanner(), {
  entryOnly: true,
  raw: true
});

// TODO: the moment.js language files should be excluded by default (they are quite big)
var webpackConfig = {
  entry: ENTRY,
  output: {
    library: 'vis',
    libraryTarget: 'umd',
    path: DIST,
    filename: VIS_JS,
    sourcePrefix: '  '
  },
  // exclude requires of moment.js language files
  module: {
    wrappedContextRegExp: /$^/
  },
  plugins: [ bannerPlugin ],
  cache: true
};

var webpackConfigLight = {
  entry: ENTRY,
  output: {
    library: 'vis',
    libraryTarget: 'umd',
    path: DIST,
    filename: VIS_LIGHT_JS,
    sourcePrefix: '  '
  },  
  externals: [
    'hammerjs',
    'moment'
  ],
  plugins: [ bannerPlugin ],
  cache: true
};

var uglifyConfig = {
  outSourceMap: VIS_MAP,
  output: {
    comments: /@license/
  }
};

// create a single instance of the compiler to allow caching
var compiler = webpack(webpackConfig);
var compilerLight = webpack(webpackConfigLight);

// clean the dist/img directory
gulp.task('clean', function (cb) {
  rimraf(DIST + '/img', cb);
});

gulp.task('bundle-js', ['clean'], function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  compiler.run(function (err, stats) {
    if (err) gutil.log(err);
    cb();
  });
});

gulp.task('bundle-js-light', ['clean'], function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  compilerLight.run(function (err, stats) {
    if (err) gutil.log(err);
    cb();
  });
});

// bundle and minify css
gulp.task('bundle-css', ['clean'], function () {
  var files = [
    './lib/timeline/component/css/timeline.css',
    './lib/timeline/component/css/panel.css',
    './lib/timeline/component/css/labelset.css',
    './lib/timeline/component/css/itemset.css',
    './lib/timeline/component/css/item.css',
    './lib/timeline/component/css/timeaxis.css',
    './lib/timeline/component/css/currenttime.css',
    './lib/timeline/component/css/customtime.css',
    './lib/timeline/component/css/animation.css',

    './lib/timeline/component/css/dataaxis.css',
    './lib/timeline/component/css/pathStyles.css',

    './lib/network/css/network-manipulation.css',
    './lib/network/css/network-navigation.css'
  ];

  return gulp.src(files)
      .pipe(concat(VIS_CSS))
      .pipe(gulp.dest(DIST))

    // TODO: nicer to put minifying css in a separate task?
      .pipe(minifyCSS())
      .pipe(rename(VIS_MIN_CSS))
      .pipe(gulp.dest(DIST));
});

gulp.task('copy', ['clean'], function () {
  var network = gulp.src('./lib/network/img/**/*')
      .pipe(gulp.dest(DIST + '/img/network'));

  var timeline = gulp.src('./lib/timeline/img/**/*')
      .pipe(gulp.dest(DIST + '/img/timeline'));

  return merge(network, timeline);
});

gulp.task('minify', ['bundle-js'], function (cb) {
  // minify full version of vis.js
  var result = uglify.minify([DIST + '/' + VIS_JS], uglifyConfig);
  fs.writeFileSync(DIST + '/' + VIS_MIN_JS, result.code);
  fs.writeFileSync(DIST + '/' + VIS_MAP, result.map);

  // minify light version of vis.js (external dependencies excluded)
  var result = uglify.minify([DIST + '/' + VIS_LIGHT_JS], uglifyConfig);
  fs.writeFileSync(DIST + '/' + VIS_LIGHT_MIN_JS, result.code);
  fs.writeFileSync(DIST + '/' + VIS_LIGHT_MAP, result.map);

  cb();
});

gulp.task('bundle', ['bundle-js', 'bundle-js-light', 'bundle-css', 'copy']);

// read command line arguments --bundle and --minify
var bundle = 'bundle' in argv;
var minify = 'minify' in argv;
var watchTasks = [];
if (bundle || minify) {
  // do bundling and/or minifying only when specified on the command line
  watchTasks = [];
  if (bundle) watchTasks.push('bundle');
  if (minify) watchTasks.push('minify');
}
else {
  // by default, do both bundling and minifying
  watchTasks = ['bundle', 'minify'];
}

// The watch task (to automatically rebuild when the source code changes)
gulp.task('watch', watchTasks, function () {
  gulp.watch(['index.js', 'lib/**/*'], watchTasks);
});

// The default task (called when you run `gulp`)
gulp.task('default', ['clean', 'bundle', 'minify']);

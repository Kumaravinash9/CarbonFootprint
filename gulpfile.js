var gulp = require('gulp');
var Server = require('karma').Server;
var flatten = require('gulp-flatten');
var argv = require('yargs').argv; 
var gulpif = require('gulp-if');
var gulpFilter = require('gulp-filter');
var deleteLines = require('gulp-delete-lines');
var stripDebug = require('gulp-strip-debug');
var uglify = require('gulp-uglify');
var shell = require('gulp-shell');
var del = require('delete-empty');
var runSequence = require('run-sequence');
var cheerio = require('gulp-cheerio');
var jeditor = require('gulp-json-editor');
var variables = require('./buildVariables.json');
var babel = require('gulp-babel');
var eslint = require('gulp-eslint');
var merged = require('merge-stream');
var lintFiles = [
  'Source/**/*.js',
  '!Source/**/*.min.js',
  '!Source/Chrome/background/google-maps-api.js'
];
var gulpSequence = require('gulp-sequence');

var validatorFilter = gulpFilter('**/validatorServer.js', { restore: true });
var doMinify = argv.debugApp === undefined ? true : false;
var transpiledFiles = gulp
  .src('Source/Core/**/*.js')
  .pipe(babel())
  .pipe(validatorFilter)
  .pipe(
    gulpif(
      !doMinify,
      deleteLines({
        filters: [/Raven(.|\s)+?;/g]
      })
    )
  )
  .pipe(validatorFilter.restore);
var chromeBuildpath = 'Build/Chrome/';
var safariBuildpath = 'Build/Safari/CarbonFootprint.safariextension/';
var webExtensionBuildpath = 'Build/WebExtension-Firefox/';
process.env.mode = argv.debugApp === undefined ? 'production' : 'development';

gulp.task('prepareTest', function() {
  var es6files = [
    'Source/Core/core/storageManager.js',
    'Source/Core/core/CarbonFootprintCommon.js',
    'Source/Core/core/TrainsCarbonFootprintCore.js',
    'Source/Core/core/helpers/flightDataHelper.js',
    'Source/Core/core/FlightsFootprintCommon.js',
    'Source/Core/core/FlightsCarbonFootprintCore.js',
    'Source/Core/core/MapsCarbonFootprintCore.js',
    'Source/Core/core/validator/basicValidator.js',
    'Source/Core/core/validator/flightsValidator.js',
    'Source/Core/core/validator/mapsValidator.js',
    'Source/Core/core/validator/trainsValidator.js',
    'Source/Core/core/inform.js',
    'Spec/Mocks/SentryServerMock.js',
    'Spec/Mocks/MockHelper.js',
    'Spec/**/*Spec.js'
  ];
  var jsonFiles = 'Source/Core/**/*.json';
  return merged(
    gulp
      .src(es6files)
      .pipe(babel())
      .pipe(gulp.dest('Build/test')),
    gulp.src(jsonFiles).pipe(gulp.dest('Build/test'))
  );
});
gulp.task('karma', function(done) {
  new Server(
    {
      configFile: __dirname + '/karma.conf.js',
      singleRun: true
    },
    done
  ).start();
});

gulp.task('eslint', function() {
  return gulp
    .src(lintFiles)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


gulp.task('localesChrome', function() {
  return gulp
    .src('Source/Locales/**/*.json')
    .pipe(gulp.dest(chromeBuildpath + '_locales'));
});

gulp.task('coreChrome', function() {
  var linkFilter = gulpFilter('**/knowMore.html', { restore: true });
  var validatorFilter = gulpFilter('**/validatorServer.js', { restore: true });
  return merged(
    transpiledFiles
      .pipe(gulpif(doMinify, uglify()))
      .pipe(gulp.dest(chromeBuildpath)),
    gulp
      .src(['!Source/Core/**/*.js', 'Source/Core/**'])
      .pipe(validatorFilter)
      .pipe(
        gulpif(
          !doMinify,
          deleteLines({
            filters: [/Raven(.|\s)+?;/g]
          })
        )
      )
      .pipe(validatorFilter.restore)
      .pipe(linkFilter)
      .pipe(
        cheerio(function($, file) {
          $('#rating-link')
            .attr('href', variables['chrome']['storeLink'])
            .html(
              `<i class="fas fa-external-link-alt" aria-hidden="true"></i> ${variables[
                'chrome'
              ]['storeName']}`
            );
          $('#store-link-1')
            .attr('href', variables['firefox']['storeLink'])
            .html(
              `<img src="${variables['firefox'][
                'badge'
              ]}" class="img-responsive" />`
            );
          $('#store-link-2')
            .attr('href', variables['safari']['storeLink'])
            .html(
              `<img src="${variables['safari'][
                'badge'
              ]}" class="img-responsive" />`
            );
        })
      )
      .pipe(linkFilter.restore)
      .pipe(gulp.dest(chromeBuildpath))
  );
});

gulp.task('specificChrome', function() {
  var jsFilter = gulpFilter('**/*.js', { restore: true });
  var validatorFilter = gulpFilter('**/validatorServer.js', { restore: true });
  return gulp
    .src('Source/Chrome/**')
    .pipe(jsFilter)
    .pipe(gulpif(doMinify, stripDebug()))
    .pipe(gulpif(doMinify, uglify()))
    .pipe(jsFilter.restore)
    .pipe(validatorFilter)
    .pipe(
      gulpif(
        !doMinify,
        deleteLines({
          filters: [/Raven(.|\s)+;/g]
        })
      )
    )
    .pipe(validatorFilter.restore)
    .pipe(gulp.dest(chromeBuildpath));
});

gulp.task('coreSafari', function() {
  var linkFilter = gulpFilter('**/knowMore.html', { restore: true });
  return merged(
    transpiledFiles
      .pipe(gulpif(doMinify, uglify()))
      .pipe(gulp.dest(safariBuildpath)),
    gulp
      .src(['!Source/Core/**/*.js', 'Source/Core/**'])
      .pipe(linkFilter)
      .pipe(
        cheerio(function($, file) {
          /*
		* TODO Safari is currently linked to https://safari-extensions.apple.com.
		* Update variables.json with appropriate link once app is published
		*/
          $('#rating-link')
            .attr('href', variables['safari']['storeLink'])
            .html(
              `<i class="fas fa-external-link-alt" aria-hidden="true"></i> ${variables[
                'safari'
              ]['storeName']}`
            );
          $('#store-link-1')
            .attr('href', variables['chrome']['storeLink'])
            .html(
              `<img src="${variables['chrome'][
                'badge'
              ]}" class="img-responsive" />`
            );
          $('#store-link-2')
            .attr('href', variables['firefox']['storeLink'])
            .html(
              `<img src="${variables['firefox'][
                'badge'
              ]}" class="img-responsive" />`
            );
        })
      )
      .pipe(linkFilter.restore)
      .pipe(gulp.dest(safariBuildpath))
  );
});

gulp.task('chromeShared', function() {
  var jsFilter = gulpFilter('**/*.js', { restore: true });
  var validatorFilter = gulpFilter('**/validatorServer.js', { restore: true });
  return gulp
    .src('Source/Chrome/background/**')
    .pipe(jsFilter)
    .pipe(gulpif(doMinify, stripDebug()))
    .pipe(gulpif(doMinify, uglify()))
    .pipe(jsFilter.restore)
    .pipe(validatorFilter)
    .pipe(
      gulpif(
        !doMinify,
        deleteLines({
          filters: [/Raven(.|\s)+?;/g]
        })
      )
    )
    .pipe(validatorFilter.restore)
    .pipe(gulp.dest(safariBuildpath + 'background/'));
});

gulp.task('specificSafari', function() {
  var jsFilter = gulpFilter('**/*.js', { restore: true });
  var validatorFilter = gulpFilter('**/validatorServer.js', { restore: true });
  return gulp
    .src('Source/Safari/**')
    .pipe(jsFilter)
    .pipe(gulpif(doMinify, stripDebug()))
    .pipe(gulpif(doMinify, uglify()))
    .pipe(jsFilter.restore)
    .pipe(validatorFilter)
    .pipe(
      gulpif(
        !doMinify,
        deleteLines({
          filters: [/Raven(.|\s)+?;/g]
        })
      )
    )
    .pipe(validatorFilter.restore)
    .pipe(gulp.dest(safariBuildpath));
});

gulp.task('localesSafari', function() {
  return gulp
    .src('Source/Locales/**/*.json')
    .pipe(gulp.dest(safariBuildpath + '_locales'));
});

// WebExtension Building
gulp.task('localesWebext', function() {
  return gulp
    .src('Source/Locales/**/*.json')
    .pipe(gulp.dest(webExtensionBuildpath + '_locales'));
});

gulp.task('coreWebExt', function() {
  var linkFilter = gulpFilter('**/knowMore.html', { restore: true });
  return merged(
    transpiledFiles
      .pipe(gulpif(doMinify, uglify()))
      .pipe(gulp.dest(webExtensionBuildpath)),
    gulp
      .src(['!Source/Core/**/*.js', 'Source/Core/**'])
      .pipe(linkFilter)
      .pipe(
        cheerio(function($, file) {
          $('#rating-link')
            .attr('href', variables['firefox']['storeLink'])
            .html(
              `<i class="fas fa-external-link-alt" aria-hidden="true"></i> ${variables[
                'firefox'
              ]['storeName']}`
            );
          $('#store-link-1')
            .attr('href', variables['safari']['storeLink'])
            .html(
              `<img src="${variables['safari'][
                'badge'
              ]}" class="img-responsive" />`
            );
          $('#store-link-2')
            .attr('href', variables['chrome']['storeLink'])
            .html(
              `<img src="${variables['chrome'][
                'badge'
              ]}" class="img-responsive" />`
            );
        })
      )
      .pipe(linkFilter.restore)
      .pipe(gulp.dest(webExtensionBuildpath))
  );
});

gulp.task('specificWebExt', function() {
  var jsFilter = gulpFilter('**/*.js', { restore: true });
  var manifestFilter = gulpFilter('**/manifest.json', { restore: true });
  var validatorFilter = gulpFilter('**/validatorServer.js', { restore: true });
  return gulp
    .src('Source/Chrome/**')
    .pipe(jsFilter)
    .pipe(gulpif(doMinify, stripDebug()))
    .pipe(gulpif(doMinify, uglify()))
    .pipe(jsFilter.restore)
    .pipe(validatorFilter)
    .pipe(
      gulpif(
        !doMinify,
        deleteLines({
          filters: [/Raven(.|\s)+?;/g]
        })
      )
    )
    .pipe(validatorFilter.restore)
    .pipe(manifestFilter)
    .pipe(
      jeditor({
        applications: {
          gecko: {
            id: 'carbon-footprint@aossie.org',
            strict_min_version: '53.0'
          }
        }
      })
    )
    .pipe(manifestFilter.restore)
    .pipe(gulp.dest(webExtensionBuildpath));
});

gulp.task('clearXAttr', shell.task(['xattr -rc ' + safariBuildpath]));

gulp.task('cleanChrome', function() {
  return del.sync(chromeBuildpath);
});

gulp.task('cleanSafari', function() {
  return del.sync(safariBuildpath);
});



gulp.task('cleanWebExt', function() {
  return del.sync(webExtensionBuildpath);
});


gulp.task('groupChrome', [
  'cleanChrome',
  'localesChrome',
  'coreChrome',
  'specificChrome'
]);
gulp.task('copySafariFiles', [
  'localesSafari',
  'coreSafari',
  'chromeShared',
  'specificSafari'
]);
gulp.task('groupWebext', [
  'cleanWebExt',
  'localesWebext',
  'coreWebExt',
  'specificWebExt'
]);

gulp.task('groupSafari', function(done) {
  runSequence('cleanSafari', 'copySafariFiles', 'clearXAttr', function() {
    done();
  });
});

gulp.task('group', [
  'groupChrome',
  'groupSafari',
  'groupWebext'
]);


gulp.task('test', gulpSequence('prepareTest', 'eslint', 'karma'));
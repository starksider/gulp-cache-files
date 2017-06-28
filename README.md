# gulp-cache-files

A disk based files caching task for [gulp](http://gulpjs.com/). This plugin based on file [mtime](https://en.wikipedia.org/wiki/Mtime) by default (could use another file property after some configurations see below) it writes json file with formatted relative path as key and mtime as value. One of the main features of this plugin is that it can deal with projects where source folder is dist folder (it could be useful for saving disk space when you have a lot of images in project).

## Installation
Install package with NPM and add it to your development dependencies:  

```
npm install gulp-cache-files
```

## Examples
Basic example of using the cache to manage image minification with the imagemin module.

```javascript
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var cacheFiles = require('gulp-cache-files');

gulp.task('images', function() {
  return gulp.src('./images/*.{jpg,png,jpeg,gif,svg}', {read: false})
    // Specify the location and name of the cache file or use it without parameter (creates default file)
    .pipe(cacheFiles.filter('./mycache/manifest.json'))
    .pipe(imagemin({
      verbose: true
    }))
    .pipe(gulp.dest('./images/'))
    .pipe(cacheFiles.manifest());
});
```
{read: false} option used to do not load file contents, which increases performance (file contents will be passed through the pipeline inside filter function)
This will create a cache file named `manifest.json` of all files passed through the pipeline to be excluded from subsequent runs. If a file that has been cached is updated, the cache will recognize this and pass the file through to update it in the manifest.json file.
*cache file (`manifest.json`) could be added to version control for saving time of other developers

When you need 2 or more uses of gulp-cache-files module you should use Prototype as on example below:

```javascript
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var jshint = require('gulp-jshint');
var CacheFiles = require('gulp-cache-files').Prototype;

gulp.task('images', function() {
  var cacheFiles = new CacheFiles();
  return gulp.src('./images/*.{jpg,png,jpeg,gif,svg}', {read: false})
    .pipe(cacheFiles.filter())
    .pipe(imagemin({
      verbose: true
    }))
    .pipe(gulp.dest('./images/'))
    .pipe(cacheFiles.manifest());
});

gulp.task('jshint', function() {
  var cacheFiles = new CacheFiles();
  return gulp.src('scripts/*.js')
    .pipe(cacheFiles.filter('./js-cache/manifest.json'))
    .pipe(jshint())
    .pipe(cacheFiles.manifest())
});
```

Use of manifest function separately from filter function:

```javascript
var gulp = require('gulp');
var cacheFiles = require('gulp-cache-files');

gulp.task('store-mtimes', function() {
  return gulp.src('./files/**/*', {read: false})
    .pipe(cacheFiles.manifest('files-mtimes.json'))
    .pipe(gulp.dest('.'));
});
```
it just writes file.stat.mtime.geеTime() as value and formatted* relative path as key into file 'files-mtimes.json'
*formatted means that it replaces Windows backslashes with such rule `path.replace(/\\/g, '/')`

Compare custom file properties:


```javascript
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var cacheFiles = require('gulp-cache-files');
var Q = require('kew');
var fs = require('fs');

gulp.task('images', function() {
  return gulp.src('./images/*.{jpg,png,jpeg,gif,svg}', {read: false})
    .pipe(cacheFiles.filter({
      dest: './size-cache.json',
      comparator: function(criteria, file){
        //if cached size property (criteria) is same
        //as size of current file at moment when it passing through stream
        //then file is cached and it is not going through stream
        return criteria === file.stat.size;
      }
    }))
    .pipe(imagemin({
      verbose: true
    }))
    .pipe(gulp.dest('./images/'))
    .pipe(cacheFiles.manifest({
      criteria: function (file) {
        //returns current file size value which will be written in size-cache.json
        return Q.nfcall(fs.stat, file.path).then(function(stats) {
          return stats.size;
        });
      }
    }));
});
```

## API
### `filter(dest)`
* **dest** - `string` Path to cache file (manifest.json).
 *default:* - `'./gulp-cache-files/manifest.json'`

### `filter(options)`
 * **options.dest** - `string` As above.
 * **options.comparator** - `function` Compares cached file property with uncached (by default it is file.stat.mtime)
 `options.comparator(criteria, file [, manifest])`
 **criteria** - Cached value from cache file (manifest.json)
 **file** - File object passed through stream
 **manifest** - (optional) Object where formatted relative path is a key and file property as a value `{"fixtures/foo.png":1497680208602,"fixtures/bar.png":1497680208623}`
 *default:*
   ```javascript
    function(criteria, file){
        return criteria === file.stat.mtime.getTime();
    }
   ```


### `manifest(name)`
 * **name** - `string` name of cache file. (works only if used in separate gulp task without filter function above)
 *default:* - `'manifest.json'`

### `manifest(options)`
 * **options.name** - `string` As above.
 * **options.criteria** - `function` Returns property or [kew](https://www.npmjs.com/package/kew) promise with this property which will be stored in cache file as value {"fixtures/foo.png":**1497680208602**}
 `options.criteria(file)`
 **file** - File object passed through stream
 *default:*
   ```javascript
        function(file) {
            return Q.nfcall(fs.stat, file.path).then(function(stats) {
                return stats.mtime.getTime();
            });
        }
   ```
   `Q` here is just initialized instance of [kew](https://www.npmjs.com/package/kew) framework (`var Q = require('kew');`)

## License
MIT
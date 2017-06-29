// Dependencies
var cacheFiles = require('../index');
var CacheFiles = require('../index').Prototype;
var chai = require('chai');
var gutil = require('gulp-util');
var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var through2 = require('through2').obj;

var assert = chai.assert;
var expect = chai.expect;
var PLUGIN_NAME = 'gulp-cache-files';

// Utility Functions
var throwErr = function (err) {
  if (err) throw err;
};

var rmFileWithDir = function(filepath){
  fs.unlink(filepath, function(err) {
    throwErr(err);
    fs.rmdir(path.dirname(filepath), throwErr);
  });
};


describe(PLUGIN_NAME, function () {

  describe('cache file creation', function () {
    // After - Clean up test directory
    after(function () {
      rmFileWithDir('./' + PLUGIN_NAME + '/manifest.json');
      fs.unlink('./manifest.json', throwErr);
      rmFileWithDir('./custom/foo.json');
    });

    it('Default file should be created', function(done) {
      gulp.src('./test/fixtures/*', {read: false})
        .pipe(cacheFiles.filter())
        .pipe(cacheFiles.manifest())
        .on('finish', function() {
          setTimeout(function(){
            assert(fs.existsSync('./' + PLUGIN_NAME + '/manifest.json'), 'File is not created');
            done();
          }, 100);
        });
    });

    it('Default file should be created when only manifest func called', function(done) {
      var cacheFiles = new CacheFiles();
      gulp.src('./test/fixtures/*', {read: false})
        .pipe(cacheFiles.manifest())
        .pipe(gulp.dest('./'));

        setTimeout(function(){
          assert(fs.existsSync('./manifest.json'), 'File is not created');
          done();
        }, 100);
    });

    it('Custom file should be created', function(done) {
      gulp.src('./test/fixtures/*', {read: false})
        .pipe(cacheFiles.filter('./custom/foo.json'))
        .pipe(cacheFiles.manifest());

        setTimeout(function(){
          assert(fs.existsSync('./custom/foo.json'), 'File is not created');
          done();
        }, 100);
    });
  });

  describe('filter function tests', function() {
    var manifestPath = './filter/manifest.json';
    var cacheFiles = new CacheFiles();

    beforeEach(function(){
      gulp.src('./test/fixtures/*', {read: false})
        .pipe(cacheFiles.filter(manifestPath))
        .pipe(cacheFiles.manifest());
    });

    // After - Clean up test directory
    afterEach(function() {
      rmFileWithDir(manifestPath);
    });

    it('should drop all cached files from stream', function(done) {
      var filesAmount = 0;
      //wait when file will be created in before
      setTimeout(function () {
        gulp.src('./test/fixtures/*', {read: false})
          .pipe(cacheFiles.filter(manifestPath))
          .on('data', function(){
            filesAmount++;
          })
          .pipe(cacheFiles.manifest())
          .on('finish', function(){
            assert.equal(filesAmount, 0);
            done();
          });
      }, 200);
    });

    it('should add file into stream if it was modified', function(done) {
      var filesAmount = 0;
      //wait when file will be created in before
      setTimeout(function () {
        gulp.src('./test/fixtures/*', {read: false})
          .on('data', function(file){
            if (file.relative === 'bar.jpg'){
              file.stat.mtime = new Date();
            }
          })
          .pipe(cacheFiles.filter(manifestPath))
          .on('data', function(){
            filesAmount++;
          })
          .pipe(cacheFiles.manifest())
          .on('finish', function(){
            assert.equal(filesAmount, 1);
            done();
          });
      }, 200);
    });
  });

  describe('manifest file content test', function() {
    var cacheFiles = new CacheFiles();
    var manifestPath = './manifest-content/manifest.json';
    var cachePath = './cache/cache.json';
    var mtimes = {};
    // Before - find timestamps
    before(function() {
      gulp.src('./test/fixtures/*')
        .on('data', function(file) {
          mtimes[file.relative] = file.stat.mtime.getTime();
        });
    });
    // After - Clean up test directory
    after(function() {
      rmFileWithDir(manifestPath);
      rmFileWithDir(cachePath);
    });

    it('should write correct object with relative path as key and mtime as value', function(done) {
      gulp.src('./test/fixtures/*', {read: false})
        .pipe(cacheFiles.filter(manifestPath))
        .pipe(cacheFiles.manifest())
        .on('finish', function(){
          setTimeout(function(){
            fs.readFile(manifestPath,'utf8', function(err, data) {
              throwErr(err);
              expect(JSON.parse(data)).to.deep.equal(mtimes);
              done();
            });
          }, 300);
        });
    });

    it('should write correct mtime as value if file was changed', function(done) {
      var changeTime;
      gulp.src('./test/fixtures-changed/*', {read: false})
        .pipe(cacheFiles.filter(cachePath))
        .on('data', function (file) {
          if(file.relative === 'baz.jpg'){
            var time = new Date();
            changeTime = time.getTime();
            fs.utimes(file.path, time, time, function(){});
          }
        })
        .pipe(cacheFiles.manifest())
        .on('finish', function(){
          setTimeout(function(){
            fs.readFile(cachePath,'utf8', function(err, data) {
              throwErr(err);
              assert.equal(JSON.parse(data)['baz.jpg'], changeTime);
              done();
            });
          }, 400);
        });
    });
  });
});

// Dependencies
var gulpif = require('gulp-if');
var fs = require("fs");
var path = require('path');
var gutil = require("gulp-util");
var through2 = require("through2").obj;
var Q = require('kew');

var PLUGIN_NAME = 'gulp-cache-files';

var formatPath = function(path){
    return path.replace(/\\/g, '/');
};

function Cache() {

    /**
     * Path of manifest file which is used in filter function
     * @type {string}
     * @private
     */
    this._dest = '';

    /**
     * Manifest object
     * @type {{}}
     * @private
     */
    this._manifest = {};

    /**
     * Array of actual files
     * this made for automatic deleting of non-existing files in manifest
     * @type {Array}
     * @private
     */
    this._files = [];
}

Cache.prototype.filter = function(options) {
    options = options || {};

    if (typeof options === 'string'){
        options = {dest: options};
    }

    var _this = this;
    var defaults = {
        dest: './' + PLUGIN_NAME + '/manifest.json',
        comparator: function(criteria, file){
            return criteria === file.stat.mtime.getTime();
        }
    };

    var settings = Object.assign({}, defaults, options);

    this._dest = settings.dest;

    try {
        this._manifest = JSON.parse(fs.readFileSync(_this._dest));
    } catch (err){
        if (err.code === 'ENOENT'){
            if (!fs.existsSync(path.dirname(_this._dest))){
                fs.mkdirSync(path.dirname(_this._dest));
            }
        }
    }

    return gulpif(
        function(file){
            var relative = formatPath(file.relative);

            if (file.stat.isFile()){
                _this._files.push(relative);
            }

            if (settings.comparator.length === 3){
              return settings.comparator(_this._manifest[relative], file, _this._manifest);
            } else {
              return settings.comparator(_this._manifest[relative], file);
            }
        }, through2(function(file, enc, callback){
            callback();
        }), through2(function(file, enc, callback) {
            if (file.stat.isFile()){
                file.contents = fs.readFileSync(file.path);
                callback(null, file);
            } else {
                callback();
            }
        })
    );
};



Cache.prototype.manifest = function(options) {
    options = options || {};

    if (typeof options === 'string'){
        options = {name: options};
    }

    var _this = this;
    var defaults = {
        name: 'manifest.json',
        criteria: function(file) {
            return Q.nfcall(fs.stat, file.path).then(function(stats) {
                return stats.mtime.getTime();
            });
        }
    };

    var settings = Object.assign({}, defaults, options);

    var promises = [];

    return through2(function (file, enc, callback) {
        promises.push(
            Q.resolve([formatPath(file.relative), settings.criteria(file)])
                .spread(function (relative, criteria) {
                        return {
                            relative: relative,
                            criteria: criteria
                        };
                    }
                )
        );
        if (_this._dest) {
            callback(null, file);
        } else {
            callback();
        }
    }, function (callback) {
        var self = this;
        Q.all(promises).then(function (data) {
            for (var i = 0; i < data.length; i++) {
                _this._manifest[data[i].relative] = data[i].criteria;
            }

            if (_this._files.length) {
                Object.keys(_this._manifest).forEach(function (key) {
                    if (_this._files.indexOf(key) === -1) {
                        delete _this._manifest[key];
                    }
                });
            }

            var file = new gutil.File({
                contents: new Buffer(JSON.stringify(_this._manifest)),
                base: process.cwd(),
                path: process.cwd() + '/' + settings.name
            });

            if (_this._dest){
                fs.writeFileSync(_this._dest, JSON.stringify(_this._manifest));
            } else {
                self.push(file);
            }
            callback();
        });
    });
};

module.exports = new Cache();
module.exports.Prototype = Cache;

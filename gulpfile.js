'use strict';

const gulp = require('gulp');

//////////////////////
// Webpack bundling //
//////////////////////
const webpack = require('webpack-stream');

const jsEntryPoints = 'assets/js/src/main.js';
const jsSrcDir = 'assets/js/src';
const jsOutputDir = 'assets/js/dist';

const buildJs = function () {
	return gulp.src(jsEntryPoints)
		.pipe(webpack(require('./webpack.config.js')))
		.pipe(gulp.dest(jsOutputDir));
};

const watchJs = function () {
	gulp.watch(`${jsSrcDir}/**/*.js`, buildJs);
};

//////////////////////
// SCSS Compilation //
//////////////////////
const sass = require('gulp-sass');

const cssSrcDir = 'assets/scss';
const cssOutputDir = 'assets/css';

const buildSass = function () {
	return gulp.src(`${cssSrcDir}/**/*.scss`)
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest(cssOutputDir));
};

const watchSass = function () {
	gulp.watch(`${cssSrcDir}/**/*.scss`, buildSass);
};

//////////////////
// Export tasks //
//////////////////
const build = gulp.parallel(buildSass, buildJs);
const watch = gulp.parallel(watchSass, watchJs);

exports.build = build;
exports.watch = watch;
exports.default = gulp.series(build, watch);

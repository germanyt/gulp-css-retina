'use strict';

var postcss = require('postcss');
var through = require('through2');
var objectAssign = require('object-assign');
var images = require('images');

var path = require('path');
var fs = require('fs');

var reBackgroundImageSrc = /url\((?:[\'\"])?((?:(?:http|https):\/\/)?(?:.+))(\.(?:gif|png|jpg|jpeg|webp|svg))(?:[\'\"])?\)/;

var defaultOptions = {
	decodeEntities: false,

	sourcePath: process.cwd(),

	mediaParams: '(min-device-pixel-ratio: 2), (min-resolution: 192dpi)',

	// suffix: {1: '', 2: '@2x', 3: '@3x', 4: '@4x'}
	suffix: {1: '', 2: '@2x', 3: '@3x'}
}

var cssRetina = function(options){

	options = objectAssign({}, defaultOptions, options);

	return through.obj(function(file, enc, cb){
		if (file.isNull()){
			cb(null, file);
			return;
		}

		if (file.isStream()){
			cb(new gutil.PluginError('gulp-css-retina', 'Streaming not supported'));
			return;
		}

		var content = file.contents.toString();

		var processor = postcss.parse(content, {from: file.path});

		var retinaMedia = postcss.atRule({ name: 'media', params: options.mediaParams });

		processor.walkDecls(function(decl){
			if( /^background(\-image)?$/.test(decl.prop) && reBackgroundImageSrc.test(decl.value) ){
				var match = decl.value.match( reBackgroundImageSrc );

				var src = match[1]+match[2];
				var retinaSrc = match[1]+'@2x'+match[2];

				var imagePath = path.join(options.sourcePath, src);

				if(fs.existsSync(imagePath)) {
					var img = images(imagePath);
					var imgSize = img.size();

					var sizeDecl = postcss.decl({ prop: 'background-size', value: imgSize.width + 'px '+ imgSize.height + 'px' });
					var backgroundImageDecl = postcss.decl({ prop: 'background-image', value: 'url(' + retinaSrc +')' });

					var newRule = postcss.rule({ selector: decl.parent.selector });

					newRule.append(sizeDecl);
					newRule.append(backgroundImageDecl);

					retinaMedia.append( newRule );
				}


			}
		});

		processor.append( retinaMedia );

		console.log(processor.toString());

		
		file.contents = new Buffer( processor.toString() );

		cb(null, file);
	});
}


module.exports = cssRetina;
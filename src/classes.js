'use strict';

import Chart from 'chart.js';
import positioners from './positioners.js';
import defaults from './defaults.js';

var helpers = Chart.helpers;
var LABEL_KEY = defaults.LABEL_KEY;

export default {
	OutLabel: function(el, index, ctx, config, context) {
		var resolve = Chart.helpers.options.resolve;
		// Check whether the label should be displayed
		if (!resolve([config.display, true], context, index)) {
			throw new Error('Label display property is set to false.');
		}
		// Init text
		var value = context.dataset.data[index];
		var label = context.labels[index];
		var text = resolve([config.text, defaults.text], context, index);

		/* Replace label marker */
		text = text.replace(/%l/gi, label);

		/* Replace value marker with possible precision value */
		(text.match(/%v\.?(\d*)/gi) || []).map(function(val) {
			var prec = val.replace(/%v\./gi, '');
			if (prec.length) {
				return +prec;
			} else {
				return config.valuePrecision || defaults.valuePrecision;
			}
		}).forEach(function(val) {
			text = text.replace(/%v\.?(\d*)/i, value.toFixed(val));
		});

		/* Replace percent marker with possible precision value */
		(text.match(/%p\.?(\d*)/gi) || []).map(function(val) {
			var prec = val.replace(/%p\./gi, '');
			if (prec.length) {
				return +prec;
			} else  {
				return config.percentPrecision || defaults.percentPrecision;
			}
		}).forEach(function(val) {
			text = text.replace(/%p\.?(\d*)/i, (context.percent * 100).toFixed(val) + '%');
		});

		// Count lines
		var lines = text.match(/[^\r\n]+/g);

		// If no lines => nothng to display
		if (!lines || !lines.length) {
			throw new Error('No text to show.');
		}

		// Remove unnecessary spaces
		for (var i = 0; i < lines.length; ++i) {
			lines[i] = lines[i].trim();
		}

		/* ===================== CONSTRUCTOR ==================== */
		this.init = function(text, lines) {
			// If everything ok -> begin initializing
			this.encodedText = config.text;
			this.text = text;
			this.lines = lines;
			this.label = label;
			this.value = value;
			this.ctx = ctx;
			this.useCustomLogic = resolve([config.useCustomLogic, false]);
			this.useCustomLabels = resolve([config.useCustomLabels, false]);

			// Init style
			this.style = {
				backgroundColor: resolve([config.backgroundColor, defaults.backgroundColor, 'black'], context, index),
				borderColor: resolve([config.borderColor, defaults.borderColor, 'black'], context, index),
				borderRadius: resolve([config.borderRadius, 0], context, index),
				borderWidth: resolve([config.borderWidth, 0], context, index),
				lineWidth: resolve([config.lineWidth, 2], context, index),
				lineColor: resolve([config.lineColor, defaults.lineColor, 'black'], context, index),
				color: resolve([config.color, 'white'], context, index),
				font: helpers.parseFont(resolve([config.font, {resizable: true}]), ctx.canvas.style.height.slice(0, -2)),
				padding: helpers.options.toPadding(resolve([config.padding, 0], context, index)),
				textAlign: resolve([config.textAlign, 'left'], context, index),
			};

			this.stretch = resolve([config.stretch, 40], context, index);
			this.size = helpers.textSize(ctx, this.lines, this.style.font);

			this.offsetStep = this.size.width / 20;
			this.offset = {
				x: 0,
				y: 0
			};
			this.predictedOffset = this.offset;

			var angle = -((el._model.startAngle + el._model.endAngle) / 2) / (Math.PI);
			var val = Math.abs(angle - Math.trunc(angle));

			if (val > 0.45 && val < 0.55) {
				this.predictedOffset.x = 0;
			} else if (angle <= 0.45 && angle >= -0.45) {
				this.predictedOffset.x = this.size.width / 2;
			} else if (angle >= -1.45 && angle <= -0.55) {
				this.predictedOffset.x = -this.size.width / 2;
			}
		};

		this.init(text, lines);

		/* COMPUTING RECTS PART */
		this.computeLabelRect = function() {
			var width = this.textRect.width + 2 * this.style.borderWidth;
			var height = this.textRect.height + 2 * this.style.borderWidth;

			var x = this.textRect.x - this.style.padding.left - this.style.borderWidth;
			var y = this.textRect.y - this.style.padding.top - this.style.borderWidth;

			width += this.style.padding.width;
			height += this.style.padding.height;

			return {
				x: x,
				y: y,
				width: width,
				height: height
			};
		};

		this.computeTextRect = function() {
			return {
				x: this.center.x - (this.size.width / 2),
				y: this.center.y - (this.size.height / 2),
				width: this.size.width,
				height: this.size.height
			};
		};

		this.getPoints = function() {
			return [
				{
					x: this.labelRect.x,
					y: this.labelRect.y
				},
				{
					x: this.labelRect.x + this.labelRect.width,
					y: this.labelRect.y
				},
				{
					x: this.labelRect.x + this.labelRect.width,
					y: this.labelRect.y + this.labelRect.height
				},
				{
					x: this.labelRect.x,
					y: this.labelRect.y + this.labelRect.height
				}
			];
		};

		this.containsPoint = function(point, offset) {
			if (!offset) {
				offset = 5;
			}

			return	this.labelRect.x - offset <= point.x && point.x <= this.labelRect.x + this.labelRect.width + offset
							&&
						this.labelRect.y - offset <= point.y && point.y <= this.labelRect.y + this.labelRect.height + offset;
		};


		/* ======================= DRAWING ======================= */
		// Draw label text
		this.drawText = function() {
			var align = this.style.textAlign;
			var font = this.style.font;
			var lh = font.lineHeight;
			var color = this.style.color;
			var ilen = this.lines.length;
			var x, y, idx;

			if (!ilen || !color) {
				return;
			}

			x = this.textRect.x;
			y = this.textRect.y + lh / 2;

			if (align === 'center') {
				x += this.textRect.width / 2;
			} else if (align === 'end' || align === 'right') {
				x += this.textRect.width;
			}

			this.ctx.font = this.style.font.string;
			this.ctx.fillStyle = color;
			this.ctx.textAlign = align;
			this.ctx.textBaseline = 'middle';

			for (idx = 0; idx < ilen; ++idx) {
				if (this.useCustomLabels === true) {
					//Custom styling applied for the first line
					switch(idx) {
						case 0:
							this.ctx.fillStyle = this.style.lineColor;
							this.ctx.font = this.style.font.string.replace(/\d\dpx/, (this.style.font.size - 3) + 'px');
							break;
						default:
							this.ctx.fillStyle = this.style.color;
							this.ctx.font = this.style.font.string;
					}
				}

				this.ctx.fillText(
					this.lines[idx],
					Math.round(x),
					Math.round(y),
					Math.round(this.textRect.width)
				);

				y += lh;
			}
		};

		// Draw label box
		this.drawLabel = function() {
			ctx.beginPath();
			helpers.canvas.roundedRect(
				this.ctx,
				Math.round(this.labelRect.x),
				Math.round(this.labelRect.y),
				Math.round(this.labelRect.width),
				Math.round(this.labelRect.height),
				this.style.borderRadius
			);
			this.ctx.closePath();

			if (this.style.backgroundColor) {
				this.ctx.fillStyle = this.style.backgroundColor || 'black';
				this.ctx.fill();
			}

			if (this.style.borderColor && this.style.borderWidth) {
				this.ctx.strokeStyle = this.style.borderColor;
				this.ctx.lineWidth = this.style.borderWidth;
				this.ctx.lineJoin = 'miter';
				this.ctx.stroke();
			}
		};


		this.drawLine = function() {
			this.ctx.save();

			this.ctx.strokeStyle = this.style.lineColor;
			this.ctx.lineWidth = this.style.lineWidth;
			this.ctx.lineJoin = 'miter';
			this.ctx.beginPath();
			this.ctx.moveTo(this.center.anchor.x, this.center.anchor.y);
			this.ctx.lineTo(this.center.copy.x, this.center.copy.y);
			this.ctx.stroke();

			this.ctx.restore();
		};

		this.draw = function() {
			this.drawLabel();
			this.drawText();
		};


		this.update = function(view, elements, max) {
			this.center = positioners.center(view, this.stretch);
			this.moveLabelToOffset();

			this.center.x += this.offset.x;
			this.center.y += this.offset.y;

			var valid = false;
			var useCustomLogic = this.useCustomLogic;
			var validVsX = false;
			var validVsY = false;
			var p = null;
			var pointDistance = null;
			var updateLoop = 0;
			var updateLoopLimit = 300;

			while (!valid) {
				this.textRect = this.computeTextRect();
				this.labelRect = this.computeLabelRect();
				var rectPoints = this.getPoints();

				valid = true;

				if (useCustomLogic !== true) {
					for (var e = 0; e < max; ++e) {
						var element = elements[e][LABEL_KEY];
						if (!element) {
							continue;
						}

						var elPoints = element.getPoints();

						for (var p = 0; p < rectPoints.length; ++p) {
							if (element.containsPoint(rectPoints[p])) {
								valid = false;
								break;
							}

							if(this.containsPoint(elPoints[p])) {
								valid = false;
								break;
							}
						}
					}

					if (!valid) {
						this.center = positioners.moveFromAnchor(this.center, 1);
						this.center.x += this.offset.x;
						this.center.y += this.offset.y;
					}
				} else {
					// Custom positioning logic

					if (++updateLoop > updateLoopLimit) {
						break;
					}
					if (updateLoop > updateLoopLimit / 3) {
						this.center.flipX = true;
					}

					validVsY = true;

					// Yvalidation: check if not exceeds the canvas
					for (p = 0; p < rectPoints.length; ++p) {
						if (rectPoints[p].y < 0 || rectPoints[p].y > ctx.canvas.height) {
							validVsY = false;
							break;
						}
					}

					if (validVsY === true) {
						// Y validity: resolving collissions with other labels
						for (var e = 0; e < max; ++e) {
							var element = elements[e][LABEL_KEY];
							if (!element) {
								continue;
							}

							var elPoints = element.getPoints();

							for (p = 0; p < rectPoints.length; ++p) {
								if (element.containsPoint(rectPoints[p])) {
									validVsY = false;
									break;
								}

								if(this.containsPoint(elPoints[p])) {
									validVsY = false;
									break;
								}
							}
						}
					}

					if (!validVsY) {
						this.center = moveVertically(this.center, 2);
						valid = validVsY;
						continue;
					}

					//continue;
					// X validation: resolving collission with the chart
					validVsX = true;

					// Move when any corner is within the circle
					for (p = 0; p < rectPoints.length; ++p) {
						pointDistance = getPointDistance(this.center.arc, rectPoints[p]);
						if (pointDistance <= this.center.arc.outerRadius) {
							validVsX = false;
							break;
						}
					}

					// Move when label is still too close to the center
					if (validVsX !== false) {
						pointDistance = getPointDistance(this.center.arc, this.center);
						if (pointDistance < (this.labelRect.width / 2 + this.center.arc.outerRadius + this.stretch)) {
							validVsX = false;
						}
					}

					if (!validVsX) {
						this.center = moveHorizontally(this.center, 2);
						valid = validVsX;
						continue;
					}
				}
			}

			function moveHorizontally(center, dist) {
				var arc = center.arc;
				var d = center.d;
				var angle = (arc.startAngle + arc.endAngle) / 2;
				var cosA = Math.cos(angle);
				var sinA = Math.sin(angle);

				var originalX = arc.x + cosA * d;
				var originalY = arc.y + sinA * d;
				var newX = null;

				if (center.x < arc.x) {
					newX = center.x - dist;
				} else {
					newX = center.x + dist;
				}

				d = getDistance(arc.x, arc.y, newX, center.y);

				return {
					x: newX,
					y: center.y,
					d: d,
					arc: arc,
					anchor: center.anchor,
					flipX: center.flipX,
					copy: {
						x: newX,
						y: center.y
					}
				};
			};

			function moveVertically(center, dist) {
				var arc = center.arc;
				var d = center.d;
				var angle = (arc.startAngle + arc.endAngle) / 2;
				var cosA = Math.cos(angle);
				var sinA = Math.sin(angle);

				var originalX = arc.x + cosA * d;
				var originalY = arc.y + sinA * d;
				var newY = null;

				if ((originalY < arc.y && center.flipX !== true)
					|| (originalY >= arc.y && center.flipX === true))  {
					newY = center.y + dist;
				} else {
					newY = center.y - dist;
				}

				d = getDistance(arc.x, arc.y, center.x, newY);

				return {
					x: center.x,
					y: newY,
					d: d,
					arc: arc,
					anchor: center.anchor,
					flipX: center.flipX,
					copy: {
						x: center.x,
						y: newY
					}
				};
			};

			function getPointDistance(a, b) {
				return getDistance(a.x, a.y, b.x, b.y);
			}

			function getDistance(x1, y1, x2, y2) {

				var xs = x2 - x1,
					ys = y2 - y1;

				xs *= xs;
				ys *= ys;

				return Math.sqrt( xs + ys );
			};

		};

		this.moveLabelToOffset = function() {
			if (this.predictedOffset.x <= 0 && this.offset.x > this.predictedOffset.x) {
				this.offset.x -= this.offsetStep;
				if (this.offset.x <= this.predictedOffset.x) {
					this.offset.x = this.predictedOffset.x;
				}
			} else if (this.predictedOffset.x >= 0 && this.offset.x < this.predictedOffset.x) {
				this.offset.x += this.offsetStep;
				if (this.offset.x >= this.predictedOffset.x) {
					this.offset.x = this.predictedOffset.x;
				}
			}
		};
	}
};

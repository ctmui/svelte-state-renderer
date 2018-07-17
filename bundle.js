"use strict";

var merge = require("deepmerge");

module.exports = function SvelteStateRendererFactory() {
	var defaultOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	return function makeRenderer(stateRouter) {
		var asr = {
			active: stateRouter.active,
			makePath: stateRouter.makePath,
			stateIsActive: stateRouter.stateIsActive
		};

		function render(context, cb) {
			var target = context.element,
			    template = context.template,
			    content = context.content;


			var rendererSuppliedOptions = merge(defaultOptions, {
				target: target,
				data: Object.assign(content, defaultOptions.data, { asr: asr })
			});

			function construct(component, options) {
				return options.methods ? instantiateWithMethods(component, options, options.methods) : new component(options);
			}

			var svelte = void 0;

			try {
				if (typeof template === "function") {
					svelte = construct(template, rendererSuppliedOptions);
				} else {
					var options = merge(rendererSuppliedOptions, template.options);

					svelte = construct(template.component, options);
				}
			} catch (e) {
				cb(e);
				return;
			}

			function onRouteChange() {
				svelte.set({
					asr: asr
				});
			}

			stateRouter.on("stateChangeEnd", onRouteChange);

			svelte.on("destroy", function () {
				stateRouter.removeListener("stateChangeEnd", onRouteChange);
			});

			svelte.mountedToTarget = target;
			cb(null, svelte);
		}

		return {
			render: render,
			reset: function reset(context, cb) {
				var svelte = context.domApi;
				var element = svelte.mountedToTarget;

				svelte.destroy();

				var renderContext = Object.assign({ element: element }, context);

				render(renderContext, cb);
			},
			destroy: function destroy(svelte, cb) {
				svelte.destroy();
				cb();
			},
			getChildElement: function getChildElement(svelte, cb) {
				try {
					var element = svelte.mountedToTarget;
					var child = element.querySelector("uiView");
					cb(null, child);
				} catch (e) {
					cb(e);
				}
			}
		};
	};
};

function instantiateWithMethods(Component, options, methods) {
	// const coolPrototype = Object.assign(Object.create(Component.prototype), methods)
	// return Component.call(coolPrototype, options)
	return Object.assign(new Component(options), methods);
}

/* Activate 1.0.0 */

// Binds event listeners to one or more elements that makes them behave
// like buttons, detecting both "click" events and also keydown for
// the "Enter" key and keyup for the "Space" key.

// Example usage:
// activate(nodeList, fn);
// activate(singleNode, fn);
// activate(selector, fn);

const boundEvents = [];
/*
[
	{
		node: Node,
		bindings: [
			{
				fn: Function,
				spacebarFn: Function,
				enterFn: Function
			}
		]
	}
]
*/

const { activate, deactivate } = (function () {
	const module = {
		activate: function (nodes, fn) {
			module._activator(nodes, fn, module._activateSingle);
		},

		deactivate: function (nodes, fn) {
			module._activator(nodes, fn, module._deactivateSingle);
		},

		_activator: function (nodes, fn, activator) {
			// Share the same initial logic between activate and deactivate,
			// but run a different function over each node

			if (typeof nodes === 'string') {
				try {
					nodes = document.querySelectorAll(nodes);
				} catch (e) {
					let method = activator === module._deactivateSingle ? 'deactivate' : 'activate';
					throw new DOMException(`${method} failed because it was passed an invalid selector string: '${nodes}'`);
				}
			}

			if (nodes.length) {
				nodes.forEach((node) => activator(node, fn));
			} else if (nodes instanceof Node) {
				activator(nodes, fn);
			}
		},



		_activateSingle: function (node, fn) {
			if ((node instanceof Node === false)) {
				throw new TypeError(`activate failed because a valid Node was not passed`);
			}

			if (module._getNodeBindings(node, fn)) {
				// Like addEventListener, don't try to rebind new copies of the same events
				return;
			}

			// All nodes should bind the click event
			node.addEventListener('click', fn);

			// Buttons will already treat keyboard events like clicks,
			// so only bind them to other node types
			let isButton = module._isNodeType(node, 'button');
			if (isButton === false) {
				if (module._getNodeHasBindings(node) === false) {
					// addEventListener would prevent this event being
					// bound multiple times, but be explicit that it is
					// only bound if the node has no other events bound
					node.addEventListener('keydown', module._preventSpacebarScroll);
				}

				let spacebarFn = module._makeSpacebarFn(fn);
				node.addEventListener('keyup', spacebarFn);
				let bindings = {
					spacebarFn
				};

				// Links already treat "enter" keydown like a click
				let isLink = module._isNodeType(node, 'a');
				if (isLink === false) {
					// Note that holding down "enter" will behave differently
					// for links in that it will only fire once, whereas for
					// non-links, including buttons, it will fire multiple times
					let enterFn = module._makeEnterFn(fn);
					node.addEventListener('keydown', enterFn);
					bindings.enterFn = enterFn;
				}

				module._rememberNodeBindings(node, fn, bindings);
			}
		},

		_deactivateSingle: function (node, fn) {
			if ((node instanceof Node === false)) {
				throw new TypeError(`deactivate failed because a valid Node was not passed`);
			}

			let bindings = module._getNodeBindings(node, fn);

			// All nodes have had a click event bound
			node.removeEventListener('click', fn);

			if (!bindings) {
				// No other events to unbind
				return;
			}

			// Buttons will already treat keyboard events like clicks,
			// so they didn't have keyboard events bound to them
			let isButton = module._isNodeType(node, 'button');
			if (isButton === false) {
				node.removeEventListener('keyup', bindings.spacebarFn);

				// Links already treat "enter" keydown like a click,
				// so that event wasn't bound to them
				let isLink = module._isNodeType(node, 'a');
				if (isLink === false) {
					node.removeEventListener('keydown', bindings.enterFn);
				}

				module._forgetNodeBindings(node, fn);

				if (module._getNodeHasBindings(node) === false) {
					// Only unbind this event if the node has no other bindings
					node.removeEventListener('keydown', module._preventSpacebarScroll);
				}
			}
		},



		_rememberNodeBindings: function (node, fn, bindings) {
			let nodeB = boundEvents.find(el => el.node === node);
			if (!nodeB) {
				nodeB = {
					node: node,
					bindings: [
						{
							fn
						}
					]
				};
				boundEvents.push(nodeB);
			}

			let fnB = nodeB.bindings.find(el => el.fn === fn);
			if (!fnB) {
				fnB = {
					fn
				};
				nodeB.bindings.push(fnB);
			}

			Object.assign(fnB, bindings);
		},

		_forgetNodeBindings: function (node, fn) {
			let nodeB = boundEvents.find(el => el.node === node);
			if (!nodeB) {
				return;
			}

			let fnB = nodeB.bindings.find(el => el.fn === fn);
			if (!fnB) {
				return;
			}

			let fnBIndex = nodeB.bindings.indexOf(fnB);

			nodeB.bindings.splice(fnBIndex, 1);
		},

		_getNodeBindings: function (node, fn) {
			let nodeB = boundEvents.find(el => el.node === node);
			if (!nodeB) {
				return undefined;
			}

			let fnB = nodeB.bindings.find(el => el.fn === fn);
			if (!fnB) {
				return undefined;
			}

			return fnB;
		},

		_getNodeHasBindings: function (node) {
			let nodeB = boundEvents.find(el => el.node === node);
			return !!nodeB;
		},



		_makeEnterFn: function (fn) {
			return function (e) {
				let isEnter = module._isEnter(e);

				if (isEnter) {
					fn.apply(this, arguments);
				}
			};
		},

		_isEnter: function (e) {
			let isEnter = e.key && (e.key.toLowerCase() === 'enter');

			return isEnter;
		},



		_preventSpacebarScroll: function (e) {
			// Prevent spacebar from scrolling the page down on keydown
			let node = e.target;

			let isButton = module._isNodeType(node, 'button');
			let isInput = module._isNodeType(node, 'input', 'textarea');

			let isSpacebar = module._isSpacebar(e);

			if (!isButton && !isInput && isSpacebar) {
				e.preventDefault();
			}
		},

		_makeSpacebarFn: function (fn) {
			return function (e) {
				let isSpacebar = module._isSpacebar(e);

				if (isSpacebar) {
					fn.apply(this, arguments);
				}
			};
		},

		_isSpacebar: function (e) {
			// IE11 uses 'spacebar' instead of ' '
			let isSpacebar = e.key && (e.key === ' ' || e.key.toLowerCase() === 'spacebar');

			return isSpacebar;
		},



		_isNodeType: function (node, ...nodeTypes) {
			nodeTypes = nodeTypes.map(el => el.toLowerCase());

			let nodeType = node.nodeName.toLowerCase();
			let isOfType = nodeTypes.includes(nodeType);

			return isOfType;
		}
	};

	return {
		activate: module.activate,
		deactivate: module.deactivate
	};
})();

export { activate, deactivate };
export default activate;

/* Activate 2.0.0 */

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

function activate(nodes, fn) {
	_activator(nodes, fn, _activateSingle);
}

function deactivate(nodes, fn) {
	_activator(nodes, fn, _deactivateSingle);
}

function _activator(nodes, fn, activator) {
	// Share the same initial logic between activate and deactivate,
	// but run a different function over each node

	if (typeof nodes === 'string') {
		try {
			nodes = document.querySelectorAll(nodes);
		} catch (e) {
			let method = activator === _deactivateSingle ? 'deactivate' : 'activate';
			throw new DOMException(`${method} failed because it was passed an invalid selector string: '${nodes}'`);
		}
	}

	if (nodes instanceof Node) {
		activator(nodes, fn);
	} else if (nodes.length && nodes.forEach) {
		nodes.forEach((node) => activator(node, fn));
	}
}

function _activateSingle(node, fn) {
	if ((node instanceof Node === false)) {
		throw new TypeError(`activate failed because a valid Node was not passed`);
	}

	if (_getNodeBindings(node, fn)) {
		// Like addEventListener, don't try to rebind new copies of the same events
		return;
	}

	// All nodes should bind the click event
	node.addEventListener('click', fn);

	// Buttons will already treat keyboard events like clicks,
	// so only bind them to other node types
	let isButton = _isNodeType(node, 'button');
	if (isButton === false) {
		if (_getNodeHasBindings(node) === false) {
			// addEventListener would prevent this event being
			// bound multiple times, but be explicit that it is
			// only bound if the node has no other events bound
			node.addEventListener('keydown', _preventSpacebarScroll);
		}

		let spacebarFn = _makeSpacebarFn(fn);
		node.addEventListener('keyup', spacebarFn);
		let bindings = {
			spacebarFn
		};

		// Links already treat "enter" keydown like a click
		let isLink = _isNodeType(node, 'a');
		if (isLink === false) {
			// Note that holding down "enter" will behave differently
			// for links in that it will only fire once, whereas for
			// non-links, including buttons, it will fire multiple times
			let enterFn = _makeEnterFn(fn);
			node.addEventListener('keydown', enterFn);
			bindings.enterFn = enterFn;
		}

		_rememberNodeBindings(node, fn, bindings);
	}
}

function _deactivateSingle(node, fn) {
	if ((node instanceof Node === false)) {
		throw new TypeError(`deactivate failed because a valid Node was not passed`);
	}

	let bindings = _getNodeBindings(node, fn);

	// All nodes have had a click event bound
	node.removeEventListener('click', fn);

	if (!bindings) {
		// No other events to unbind
		return;
	}

	// Buttons will already treat keyboard events like clicks,
	// so they didn't have keyboard events bound to them
	let isButton = _isNodeType(node, 'button');
	if (isButton === false) {
		node.removeEventListener('keyup', bindings.spacebarFn);

		// Links already treat "enter" keydown like a click,
		// so that event wasn't bound to them
		let isLink = _isNodeType(node, 'a');
		if (isLink === false) {
			node.removeEventListener('keydown', bindings.enterFn);
		}

		_forgetNodeBindings(node, fn);

		if (_getNodeHasBindings(node) === false) {
			// Only unbind this event if the node has no other bindings
			node.removeEventListener('keydown', _preventSpacebarScroll);
		}
	}
}

function _rememberNodeBindings(node, fn, bindings) {
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
}

function _forgetNodeBindings(node, fn) {
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
}

function _getNodeBindings(node, fn) {
	let nodeB = boundEvents.find(el => el.node === node);
	if (!nodeB) {
		return undefined;
	}

	let fnB = nodeB.bindings.find(el => el.fn === fn);
	if (!fnB) {
		return undefined;
	}

	return fnB;
}

function _getNodeHasBindings(node) {
	let nodeB = boundEvents.find(el => el.node === node);
	return !!nodeB;
}

function _makeEnterFn(fn) {
	return function (e) {
		let isEnter = _isEnter(e);

		if (isEnter) {
			fn.apply(this, arguments);
		}
	};
}

function _isEnter(e) {
	let isEnter = e.key && (e.key.toLowerCase() === 'enter');

	return isEnter;
}

function _preventSpacebarScroll(e) {
	// Prevent spacebar from scrolling the page down on keydown
	let node = e.target;

	let isButton = _isNodeType(node, 'button');
	let isInput = _isNodeType(node, 'input', 'textarea');

	let isSpacebar = _isSpacebar(e);

	if (!isButton && !isInput && isSpacebar) {
		e.preventDefault();
	}
}

function _makeSpacebarFn(fn) {
	return function (e) {
		let isSpacebar = _isSpacebar(e);

		if (isSpacebar) {
			fn.apply(this, arguments);
		}
	};
}

function _isSpacebar(e) {
	// IE11 uses 'spacebar' instead of ' '
	let isSpacebar = e.key && (e.key === ' ' || e.key.toLowerCase() === 'spacebar');

	return isSpacebar;
}

function _isNodeType(node, ...nodeTypes) {
	nodeTypes = nodeTypes.map(el => el.toLowerCase());

	let nodeType = node.nodeName.toLowerCase();
	let isOfType = nodeTypes.includes(nodeType);

	return isOfType;
}

export { activate, deactivate };
export default activate;

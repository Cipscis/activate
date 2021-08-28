import { activate, deactivate } from '/activate';

const increment = function (e) {
	e.preventDefault();

	let el = e.target;
	let activateNum = parseInt(el.getAttribute('data-activate-count'));

	activateNum += 1;

	el.setAttribute('data-activate-count', activateNum);
};


// NodeList
const nodelist = document.querySelectorAll('.js-activate-nodelist');
activate(nodelist, increment);

// Node
const node = document.querySelector('.js-activate-node');
activate(node, increment);

// string
const string = '.js-activate-string';
activate(string, increment);


// Element types
activate('.js-activate-types', increment);


// Deactivate
const counter = document.querySelector('.js-deactivate-counter');

activate('.js-deactivate-on', () => activate(counter, increment));
activate('.js-deactivate-off', () => deactivate(counter, increment));

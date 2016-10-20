var assert = require('chai').assert
var demo = require('fmtjs-demo')
var walk = require('../index')

describe('walk', function() {
	describe('empty program', function() {
		it('without any error', function() {
			var ast = demo.load_ast('empty')
			var callout = {
				enter: function() {},
				leave: function() {}
			}
			walk(ast, callout)
		})

		it('accept null callout', function() {
			var ast = demo.load_ast('empty')
			var callout = null
			walk(ast, callout)
		})

		it('fire enter', function() {
			var fired = false
			var ast = demo.load_ast('empty')
			var callout = {
				enter: function() {
					fired = true
				},
				leave: function() {}
			}
			walk(ast, callout)
			assert.isOk(fired, 'enter is not fired')
		})

		it('fire leave', function() {
			var fired = false
			var ast = demo.load_ast('empty')
			var callout = {
				enter: function() {},
				leave: function() {
					fired = true
				}
			}
			walk(ast, callout)
			assert.isOk(fired, 'leave is not fired')
		})
	});

	[
		'literal/boolean/true',
		'statement/debugger',
		'statement/empty',
		'statement/block',
		'statement/expression',
		'expression/binary/add',
		'expression/update/prefix-inc',
		'expression/logical/and',
		'expression/logical/or',
		'expression/unary/not',
		'expression/sequence/example-1',
		'expression/array/example-1',
		'expression/object/empty',
	].forEach(function(target) {

		describe(target, function() {
			it('without any error', function() {
				var ast = demo.load_ast(target)
				var callout = {
					enter: function() {},
					leave: function() {}
				}
				walk(ast, callout)
			})

			it('fire enter', function() {
				var fired = false
				var ast = demo.load_ast(target)
				var callout = {
					enter: function() {
						fired = true
					},
					leave: function() {}
				}
				walk(ast, callout)
				assert.isOk(fired, 'enter is not fired')
			})

			it('fire leave', function() {
				var fired = false
				var ast = demo.load_ast(target)
				var callout = {
					enter: function() {},
					leave: function() {
						fired = true
					}
				}
				walk(ast, callout)
				assert.isOk(fired, 'leave is not fired')
			})
		})
		
	})
})
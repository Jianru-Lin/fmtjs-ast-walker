var stack = []

var nav = {
	parent: function() {
		return stack[0]
	},
	parent_at: function(i) {
		return stack[i]
	},
	parent_len: function() {
		return stack.length
	},
	parent_each: function(cb) {
		stack.forEach(cb)
	}
}

var callout = {
	enter: function(ast, parent) {
		console.log('callout.enter ' + ast.type)
	},
	leave: function(ast, parent) {
		console.log('callout.leave ' + ast.type)
	}
}

var type_handler = {}

type_handler['Program'] = function(ast) {
	walk_children(ast, 'body')
}

type_handler['ImportDeclaration'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('import'),
			function() {
				if (ast.specifiers && ast.specifiers.length > 0) {
					return [
						vsp(),
						vjoin(walk_children(ast.specifiers, ctx).map(wrap_vdom('span', 'specifier')), function() {
							return [vcomma(), vsp()]
						})
					]
				}
			},
			vsp(),
			vkeyword('from'),
			vsp(),
			vdom('span', 'source', process_child(ast.source, ctx)),
			vsp(),
			vsemi()
		]
	)
}

type_handler['ImportDefaultSpecifier'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'local', process_child(ast.local, ctx))
		]
	)
}

type_handler['ImportSpecifier'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		vbracket(function() {
			assert(ast.local.type === ast.imported.type)
			assert(ast.local.type === 'Identifier')
			if (ast.local.name === ast.imported.name) {
				return vdom('span', 'imported', process_child(ast.imported, ctx))
			}
			else {
				return [
					vdom('span', 'imported', process_child(ast.imported, ctx)),
					vsp(),
					vkeyword('as'),
					vsp(),
					vdom('span', 'local', process_child(ast.local, ctx))
				]
			}
		})
	)
}

type_handler['ImportNamespaceSpecifier'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'asterisk', '*'),
			vsp(),
			vkeyword('as'),
			vsp(),
			vdom('span', 'local', process_child(ast.local, ctx))
		]
	)
}

type_handler['ExportAllDeclaration'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('export'),
			vsp(),
			vdom('span', 'asterisk', '*'),
			vsp(),
			vkeyword('from'),
			vsp(),
			vdom('span', 'source', process_child(ast.source, ctx)),
			vsp(),
			vsemi()
		]
	)
}

type_handler['ExportNamedDeclaration'] = function(ast) {
	// 默认会在末尾生成分号，但这也许是没有必要的
	var semi_unnecessary = false
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('export'),
			vsp(),
			function() {
				if (ast.declaration) {
					// 断言：有 declaration 必然就不可能有 specifiers
					assert(Array.isArray(ast.specifiers) && ast.specifiers.length === 0)
					// 凡是声明类型的，我们没必要在后面生成分号
					semi_unnecessary = true
					return vdom('span', 'declaration', function() {
						return process_child(ast.declaration, ctx)
					})
				}
				else if (ast.specifiers) {
					return vbracket(vdom('span', 'specifiers', vjoin(walk_children(ast.specifiers, ctx).map(wrap_vdom('span', 'specifier')), function() {
						return [vcomma(), vsp()]
					})))
				}
			},
			vdom('span', 'source', function() {
				if (ast.source) {
					return [
						vsp(),
						vkeyword('from'),
						vsp(),
						process_child(ast.source, ctx)
					]
				}
			}),
			function() {
				if (semi_unnecessary) return
				else return [vsp(), vsemi()]
			}
		]
	)
}

type_handler['ExportDefaultDeclaration'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('export'),
			vsp(),
			vkeyword('default'),
			vsp(),
			vdom('span', 'declaration', process_child(ast.declaration, ctx)),
			function() {
				var semi_unnecessary = (ast.declaration.type === 'ClassDeclaration' ||
										ast.declaration.type === 'FunctionDeclaration' ||
										ast.declaration.type === 'VariableDeclaration')
				if (!semi_unnecessary) {
					return [vsp(), vsemi()]
				}
			}
		]
	)
}

type_handler['ExportSpecifier'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'local', process_child(ast.local, ctx)),
			function() {
				assert(ast.local.type === ast.exported.type)
				assert(ast.local.type === 'Identifier')
				var is_same = ast.local.name === ast.exported.name
				if (!is_same) {
					return [
						vsp(),
						vkeyword('as'),
						vsp(),
						vdom('span', 'exported', process_child(ast.exported, ctx))
					]
				}
			}
		]
	)
}

type_handler['EmptyStatement'] = function(ast) {
	// 无事可做
}

type_handler['DebuggerStatement'] = function(ast) {
	// 无事可做
}

type_handler['FunctionDeclaration'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vdom('span', 'keyword','function'),
			vsp(),
			function() {
				if (ast.generator) {
					return [vkeyword('*'), vsp()]
				}
			},
			function() {
				// 用在 export 时 ast.id 确实可能为 null
				if (ast.id) {
					return vdom('span', 'id', [
						process_child(ast.id, ctx),
						vsp()
					])
				}
			},
			vdom('span', 'params', function() {
				// 支持默认参数
				var params = ast.params || []
				var defaults = ast.defaults || []
				var params_and_defaults = zip(params, defaults)
				return vbrace(
					vjoin(
						params_and_defaults.map(function(item) {
							var param = item[0]
							var deflt = item[1]
							return vdom(
								'span',
								'param',
								[
									vdom('span', 'name', process_child(param, ctx)),
									function() {
										if (deflt) {
											return [
												vsp(),
												vdom('span', 'eq', '='),
												vsp(),
												vdom('span', 'default', process_child(deflt, ctx))
											]
										}
									}
								]
							)
						}), 
						function() {
							return [vcomma(), vsp()]
						}
					)
				)
			}),
			vsp(),
			vdom('span', 'body', [process_child(ast.body, ctx)])
		]
	)
}

// ccfg = {no_function_keyword: true|false} 可配置是否生成 function 关键词
// ObjectExpression 下的 Property 会使用这个配置
// Class 下的 MethodDefinition 也会使用这个配置
type_handler['FunctionExpression'] = function(ast, ctx, ccfg) {
	return vdom(
		'div',
		ast.type,
		[
			function() {
				if (ccfg && ccfg.no_function_keyword) {
					return null
				}
				else {
					return [
						vdom('span', 'keyword','function'),
						vsp()
					]
				}
			},
			function() {
				if (ast.generator) {
					return [vkeyword('*'), vsp()]
				}
			},
			// id 部分不一定存在，可有可无
			function() {
				if (ast.id) {
					return [
						vdom('span', ['name'], process_child(ast.id, ctx)),
						vsp()
					]
				}
			},
			vdom('span', 'params', function() {
				// 支持默认参数
				var params = ast.params || []
				var defaults = ast.defaults || []
				var params_and_defaults = zip(params, defaults)
				return vbrace(
					vjoin(
						params_and_defaults.map(function(item) {
							var param = item[0]
							var deflt = item[1]
							return vdom(
								'span',
								'param',
								[
									vdom('span', 'name', process_child(param, ctx)),
									function() {
										if (deflt) {
											return [
												vsp(),
												vdom('span', 'eq', '='),
												vsp(),
												vdom('span', 'default', process_child(deflt, ctx))
											]
										}
									}
								]
							)
						}), 
						function() {
							return [vcomma(), vsp()]
						}
					)
				)
			}),
			vsp(),
			vdom('span', 'body', [process_child(ast.body, ctx)])
		]
	)
}

type_handler['ArrowFunctionExpression'] = function(ast) {
	assert(ast.id === null)
	return vdom(
		'div',
		ast.type,
		[
			vdom('span', 'params', function() {
				// 支持默认参数
				var params = ast.params || []
				var defaults = ast.defaults || []
				var params_and_defaults = zip(params, defaults)
				return vbrace(
					vjoin(
						params_and_defaults.map(function(item) {
							var param = item[0]
							var deflt = item[1]
							return vdom(
								'span',
								'param',
								[
									vdom('span', 'name', process_child(param, ctx)),
									function() {
										if (deflt) {
											return [
												vsp(),
												vdom('span', 'eq', '='),
												vsp(),
												vdom('span', 'default', process_child(deflt, ctx))
											]
										}
									}
								]
							)
						}),
						function() {
							return [vcomma(), vsp()]
						}
					)
				)
			}),
			vsp(),
			voperator('=>'),
			vsp(),
			vdom('span', 'body', function() {
				var body = ast.body
				if (body.type === 'ObjectExpression') {
					return v_exp_brace(process_child(body, ctx))
				}
				else {
					return [process_child(ast.body, ctx)]
				}
			})
		]
	)
}

type_handler['RestElement'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vkeyword('...'),
			vdom('span', 'argument', process_child(ast.argument, ctx))
		]
	)
}

type_handler['SpreadElement'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vkeyword('...'),
			vdom('span', 'argument', process_child(ast.argument, ctx))
		]
	)
}

type_handler['ExpressionStatement'] = function(ast) {
	walk_child(ast, 'expression')
}

type_handler['BlockStatement'] = function(ast) {
	walk_children(ast, 'body')
}

type_handler['ClassDeclaration'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('class'),
			vsp(),
			function() {
				// 如下情形时 id 会为 null
				// export default function () {}
				if (ast.id) {
					return vdom('span', 'id', [
						process_child(ast.id, ctx),
						vsp()
					])
				}
			},
			function() {
				if (ast.superClass) {
					return [
						vkeyword('extends'),
						vsp(),
						vdom('span', 'superClass', process_child(ast.superClass, ctx)),
						vsp()
					]
				}
			},
			vbracket(function() {
				return vdom('span', 'body', process_child(ast.body, ctx))
			})
		]
	)
}

type_handler['ClassExpression'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vkeyword('class'),
			vsp(),
			function() {
				if (ast.id) {
					return [
						process_child(ast.id, ctx),
						vsp(),
					]
				}
			},
			function() {
				if (ast.superClass) {
					return [
						vkeyword('extends'),
						vsp(),
						vdom('span', 'superClass', process_child(ast.superClass, ctx)),
						vsp()
					]
				}
			},
			vbracket(function() {
				return vdom('span', 'body', process_child(ast.body, ctx))
			})
		]
	)
}

type_handler['ClassBody'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		walk_children(ast.body, ctx).map(wrap_vdom('div', 'body-item'))
	)
}

type_handler['MethodDefinition'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			function() {
				if (ast['static']) {
					return [
						vkeyword('static'),
						vsp()
					]
				}
			},
			function() {
				if (ast.kind === 'get' || ast.kind === 'set') {
					return [
						vkeyword(ast.kind),
						vsp()
					]
				}
				else {
					assert(ast.kind === 'method' || ast.kind === 'constructor')
					// do nothing
				}
			},
			function() {
				if (ast.computed) {
					return vdom('span', 'key', vsqbracket(process_child(ast.key, ctx)))
				}
				else {
					return vdom('span', 'key', process_child(ast.key, ctx))
				}
			},
			vsp(),
			function() {
				return vdom('span', 'value', process_child(ast.value, ctx, {no_function_keyword: true})) // 注意传递了信息给 FunctionExpression 让它不要生成 function 关键字
			}
		]
	)
}

type_handler['Super'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		vkeyword('super')
	)
}

// ccfg = {nosemi: true|false} 可配置是否生成末尾分号
// ForStatement, ForInStatement 会使用这个配置
type_handler['VariableDeclaration'] = function(ast, ctx, ccfg) {
	// console.log(ast)
	assert(ast.kind === 'var' || ast.kind === 'const' || ast.kind === 'let')
	return vdom(
		'div',
		ast.type,
		[
			vdom('span', ['kind', ast.kind], vkeyword(ast.kind)),
			vsp(),
			vdom('span', 'declarations', function() {
				return walk_children(ast.declarations, ctx).map(function(declaration, i) {
					return vdom('div', 'declaration', function() {
						return [
							declaration,
							function() {
								if (i === (ast.declarations.length - 1)) {
									if (ccfg && ccfg.nosemi) return undefined
									return [vsp(), vsemi()]
								}
								else {
									return [vcomma()]
								}
							}
						]
					})
				})
			})
		]
	)
}

type_handler['VariableDeclarator'] = function(ast) {
	// console.log(ast)
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'id', process_child(ast.id, ctx)),
			function() {
				if (ast.init) {
					return vdom(
						'span',
						'init',
						[
							vsp(),
							vdom('span', 'eq', '='),
							vsp(),
							vdom('span', 'init', process_child(ast.init, ctx))
						]
					)
				}
			}
		]
	)
}

type_handler['WithStatement'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('with'),
			vsp(),
			// 少见的括号在结构之上的例外
			vbrace(vdom('span', 'object', process_child(ast.object, ctx))),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ctx))
		]
	)
}

type_handler['ReturnStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vdom('span', 'keyword', 'return'),
			function() {
				if (ast.argument) {
					return [
						vsp(),
						vdom('span', 'argument', process_child(ast.argument, ctx))
					]
				}
			},
			vsp(),
			vsemi()
		]
	)
}

type_handler['YieldExpression'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'keyword', 'yield'),
			function() {
				if (ast.delegate) {
					assert(ast.argument)
					return [
						vsp(),
						vkeyword('*')
					]
				}
			},
			function() {
				if (ast.argument) {
					return [
						vsp(),
						vdom('span', 'argument', process_child(ast.argument, ctx))
					]
				}
			}
		]
	)
}

type_handler['IfStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vdom('span', 'keyword', 'if'),
			vsp(),
			vdom('span', 'test', vbrace(process_child(ast.test, ctx))),
			vsp(),
			vdom('span', 'consequent', process_child(ast.consequent, ctx)),
			function() {
				if (ast.alternate) {
					return [
						vsp(),
						vdom('span', 'keyword', 'else'),
						vsp(),
						vdom('span', 'alternate', process_child(ast.alternate, ctx))
					]
				}
			}
		]
	)
}

type_handler['WhileStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('while'),
			vsp(),
			vdom('span', 'test', vbrace(process_child(ast.test, ctx))),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ctx))
		]
	)
}

type_handler['DoWhileStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('do'),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ctx)),
			vsp(),
			vkeyword('while'),
			vsp(),
			vdom('span', 'test', vbrace(process_child(ast.test, ctx)))
		]
	)
}

type_handler['TryStatement'] = function(ast) {
	// console.log(ast)
	if (ast.guardedHandlers) assert(ast.guardedHandlers.length === 0)
	if (ast.handlers) assert(ast.handlers.length === 0 || ast.handlers.length === 1)
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('try'),
			vsp(),
			vdom('span', 'block', process_child(ast.block, ctx)),
			function() {
				if (ast.handler) {
					return [
						vsp(),
						vdom('span', 'handler', process_child(ast.handler, ctx)) // CatchClause
					]
				}
			},
			function() {
				if (ast.finalizer) {
					return [
						vsp(),
						vkeyword('finally'),
						vsp(),
						vdom('span', 'finalizer', process_child(ast.finalizer, ctx))
					]
				}
			}
		]
	)
}

type_handler['CatchClause'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vkeyword('catch'),
			vsp(),
			vdom('span', 'param', vbrace(process_child(ast.param, ctx))),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ctx))
		]
	)
}

type_handler['ForStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		'ast.type',
		[
			vkeyword('for'),
			vsp(),
			// 少见的括号在结构之上的例外
			vbrace([
				vdom('span', 'init', function() {
					// init 部分为 null 是可能的
					if (!ast.init) return
					// 命令 VariableDeclaration 不要生成末尾分号，因为这里会生成
					if (ast.init.type === 'VariableDeclaration') {
						return process_child(ast.init, ctx, {nosemi: true})
					}
					else {
						return process_child(ast.init, ctx)
					}
				}),
				vsp(), 
				vsemi(),
				function() {
					if (ast.test) {
						return [
							vsp(),
							vdom('span', 'test', process_child(ast.test, ctx)),
						]
					}
				},
				vsp(),
				vsemi(),
				vsp(),
				function() {
					if (ast.update) {
						return vdom('span', 'update', process_child(ast.update, ctx))
					}
				}
			]),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ctx))
		]
	)
}

type_handler['ForInStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('for'),
			vsp(),
			// 少见的括号在结构之上的例外
			vbrace([
				vdom('span', 'left', function() {
					// 命令 VariableDeclaration 不要生成末尾分号，因为这里会生成
					if (ast.left && ast.left.type === 'VariableDeclaration') {
						return process_child(ast.left, ctx, {nosemi: true})
					}
					else {
						return process_child(ast.left, ctx)
					}
				}),
				vsp(),
				vkeyword('in'),
				vsp(),
				vdom('span', 'right', process_child(ast.right, ctx))
			]),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ast))
		]
	)
}

type_handler['ForOfStatement'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('for'),
			vsp(),
			// 少见的括号在结构之上的例外
			vbrace([
				vdom('span', 'left', function() {
					// 命令 VariableDeclaration 不要生成末尾分号，因为这里不需要
					if (ast.left && ast.left.type === 'VariableDeclaration') {
						return process_child(ast.left, ctx, {nosemi: true})
					}
					else {
						return process_child(ast.left, ctx)
					}
				}),
				vsp(),
				vkeyword('of'),
				vsp(),
				vdom('span', 'right', process_child(ast.right, ctx))
			]),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ast))
		]
	)
}

type_handler['ContinueStatement'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('continue'),
			function() {
				if (ast.label) {
					return [
						vsp(),
						vdom('span', 'label', process_child(ast.label, ctx))
					]
				}
			},
			vsp(),
			vsemi()
		]
	)
}

type_handler['BreakStatement'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('break'),
			function() {
				if (ast.label) {
					return [
						vsp(),
						vdom('span', 'label', process_child(ast.label, ctx))
					]
				}
			},
			vsp(),
			vsemi()
		]
	)
}

type_handler['LabeledStatement'] = function(ast) {
	// console.log(ast)
	return vdom(
		'div',
		ast.type,
		[
			vdom('span', 'label', process_child(ast.label, ctx)),
			vcolon(),
			vsp(),
			vdom('span', 'body', process_child(ast.body, ctx))
		]
	)
}

type_handler['ThrowStatement'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('throw'),
			vsp(),
			vdom('span', 'argument', process_child(ast.argument, ctx)),
			vsp(),
			vsemi()
		]
	)
}

type_handler['SwitchStatement'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			vkeyword('switch'),
			vsp(),
			vdom('span', 'discriminant', function() {
				return vbrace(process_child(ast.discriminant, ctx))
			}),
			vsp(),
			// 少见的括号在结构之上的例外
			vbracket(function() {
				return vdom('span', 'cases', function() {
					return walk_children(ast.cases, ctx).map(wrap_vdom('div', 'case'))
				})
			})
		]
	)
}

type_handler['SwitchCase'] = function(ast) {
	return vdom(
		'div',
		ast.type,
		[
			function() {
				// 一般的 case
				if (ast.test) {
					return [
						vkeyword('case'),
						vsp(),
						vdom('span', 'test', process_child(ast.test, ctx))
					]
				}
				// 没有 test 部分的是 default 分句
				else {
					return [
						vkeyword('default')
					]
				}
			},
			vcolon(),
			vsp(),
			vdom('span', 'consequent', walk_children(ast.consequent, ctx))
		]
	)
}

type_handler['CallExpression'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'callee', function() {
				if (ast.callee.type === 'FunctionExpression') {
					return v_exp_brace(process_child(ast.callee, ctx))
				}
				else {
					return process_child(ast.callee, ctx)
				}
			}),
			vsp(),
			vdom('span', 'arguments', function() {
				return vbrace(vjoin(walk_children(ast.arguments, ctx).map(wrap_vdom('span', 'argument')), function() {
					return [vcomma(), vsp()]
				}))
			})
		]
	)
}

type_handler['AssignmentExpression'] = function(ast) {
	// console.log(ast)
	return vdom(
		'span',
		ast.type,
		[
			// vdom('span', 'left', v_exp_brace(process_child(ast.left, ctx))),
			vdom('span', 'left', process_child(ast.left, ctx)),
			vsp(),
			voperator('='),
			vsp(),
			function() {
				// 赋值表达式的右侧如果为序列表达式则必须要补括号
				if (ast.right.type === 'SequenceExpression') {
					return vdom('span', 'right', v_exp_brace(process_child(ast.right, ctx)))
				}
				else {
					return vdom('span', 'right', process_child(ast.right, ctx))
				}
			}
		]
	)
}

type_handler['MemberExpression'] = function(ast) {
	// console.log(ast)
	if (ast.computed) {
		return vdom(
			'span',
			ast.type,
			[
				vdom('span', 'object', process_child(ast.object, ctx)),
				vdom('span', 'property', vsqbracket(process_child(ast.property, ctx)))
			]
		)
	}
	else {
		return vdom(
			'span',
			ast.type,
			[
				vdom('span', 'object', process_child(ast.object, ctx)),
				vdom('span', 'dot', '.'),
				vdom('span', 'property', process_child(ast.property, ctx))
			]
		)
	}
}

type_handler['NewExpression'] = function(ast) {
	// console.log(ast)
	assert(ast.callee)
	assert(ast.arguments)
	return vdom(
		'span',
		ast.type,
		[
			vkeyword('new'),
			vsp(),
			vdom('span', 'callee', process_child(ast.callee, ctx)),
			vsp(),
			vdom('span', 'arguments', [
				vbrace(function() {
					return vjoin(walk_children(ast.arguments, ctx).map(wrap_vdom('span', 'argument')), function() {
						return [vcomma(), vsp()]
					})
				})
			]),
		]
	)
}

type_handler['MetaProperty'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'meta', process_child(ast.meta, ctx)),
			vdom('span', 'dot', '.'),
			vdom('span', 'property', process_child(ast.property, ctx))
		]
	)
}

type_handler['ConditionalExpression'] = function(ast) {
	// return vdom(
	// 	'span',
	// 	ast.type,
	// 	[
	// 		vdom('span', 'test', v_exp_brace(process_child(ast.test, ctx))),
	// 		vsp(),
	// 		voperator('?'),
	// 		vsp(),
	// 		vdom('span', 'consequent', v_exp_brace(process_child(ast.consequent, ctx))),
	// 		vsp(),
	// 		voperator(':'),
	// 		vsp(),
	// 		vdom('span', 'alternate', v_exp_brace(process_child(ast.alternate, ctx)))
	// 	]
	// )

	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'test', v_exp_brace(process_child(ast.test, ctx))),
			vsp(),
			vdom('span', '_align', [
				vdom('div', '_align', [
					voperator('?'),
					vsp(),
					vdom('span', 'consequent', v_exp_brace(process_child(ast.consequent, ctx))),
					// vsp()
				]),
				vdom('div', '_align', [
					voperator(':'),
					vsp(),
					vdom('span', 'alternate', v_exp_brace(process_child(ast.alternate, ctx)))
				])
			])
		]
	)
}

type_handler['BinaryExpression'] = function(ast) {
	walk_child(ast, 'left')
	walk_child(ast, 'right')
}

type_handler['UpdateExpression'] = function(ast) {
	walk_child(ast, 'argument')
}

type_handler['LogicalExpression'] = function(ast) {
	walk_child(ast, 'left')
	walk_child(ast, 'right')
}

type_handler['UnaryExpression'] = function(ast) {
	walk_child(ast, 'argument')
}

type_handler['SequenceExpression'] = function(ast) {
	walk_children(ast, 'expressions')
}

type_handler['ArrayExpression'] = function(ast) {
	walk_children(ast, 'elements')
}

type_handler['ObjectExpression'] = function(ast) {
	walk_children(ast, 'properties')
}

type_handler['Property'] = function(ast) {
	walk_child(ast, 'key')
	walk_child(ast, 'value')
}

type_handler['AssignmentPattern'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'left', process_child(ast.left, ctx)),
			vsp(),
			voperator('='),
			vsp(),
			vdom('span', 'right', process_child(ast.right, ctx)),
		]
	)
}

type_handler['ArrayPattern'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		vdom('span', 'elements', vsqbracket(function() {
			if (!ast.elements || ast.elements.length < 1) return
			// 把 elements 中为 null 的都转为 Array
			var elements = ast.elements.map(function(e) {
				if (e === null) {
					return {
						type: 'ArrayPatternNullElement'
					}
				}
				else {
					return e
				}
			})
			// 逐个转换
			return vjoin(walk_children(elements, ctx).map(wrap_vdom('span', 'element')), function() {
				return [vcomma(), vsp()]
			})
		}))
	)
}

// 为了处理 ArrayPattern 中 null 元素而扩展出来的类型
// 不属于 esprima 解析结果
type_handler['ArrayPatternNullElement'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		null
	)
}

type_handler['ObjectPattern'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		vdom('span', 'properties', vbracket(function() {
			if (!ast.properties || ast.properties.length < 1) return
			return walk_children(ast.properties, ctx).map(wrap_vdom('div', 'property'))
		}))
	)
}

type_handler['ThisExpression'] = function(ast) {
	return vdom('span', [ast.type, 'keyword'], 'this')
}

type_handler['Identifier'] = function(ast) {
	// 无事可做
}

type_handler['TemplateElement'] = function(ast) {
	// assert(ast.value.raw === ast.value.cooked)
	return vdom(
		'span',
		ast.type,
		ast.value.raw // 这里没有使用 ast.value.cooked，以后研究清楚后再重新考虑下
	)
}

type_handler['TemplateLiteral'] = function(ast) {
	// console.log(ast)
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', '', '`'),
			function() {
				var children = []
				var quasis = ast.quasis
				var expressions = ast.expressions
				// 即使对于空模版字符串 `` 下面的条件也成立
				// 而且对于 `${e}` 这样只有表达式的空模版字符串也是成立的
				assert(quasis.length === (expressions.length + 1))
				for (var i = 0; i < quasis.length; ++i) {
					var q = quasis[i]
					var e = expressions[i]
					// 注意包装在 q 元素中
					children.push(vdom('span', 'q', process_child(q, ctx)))
					// 当 q 是尾元素时，e 必然不存在
					if (q.tail === true) assert(e === undefined)
					if (e) {
						// 注意包装在 e 元素中
						children.push(vdom('span', 'e', v_texp(process_child(e, ctx))))
					}
				}
				return children
			},
			vdom('span', '', '`')
		]
	)
}

type_handler['TaggedTemplateExpression'] = function(ast) {
	return vdom(
		'span',
		ast.type,
		[
			vdom('span', 'tag', process_child(ast.tag, ctx)),
			vdom('span', 'quasi', process_child(ast.quasi, ctx))
		]
	)
}

type_handler['Literal'] = function(ast) {
	// 无事可做
}

function walk_of(parent, rel, child) {
	assert(child)
	assert(!Array.isArray(child))
	assert(type_handler[child.type])

	try {
		stack.shift({
			ast: parent,
			rel: rel
		})
		callout.enter(child, nav)
		type_handler[child.type](child)
		callout.leave(child, nav)
	}
	finally {
		stack.unshift()
	}
}

function walk_child(ast, rel) {
	var child = ast[rel]
	walk_of(ast, rel, child)
}

function walk_children(ast, rel) {
	var children = ast[rel]
	assert(Array.isArray(children))
	children.forEach(function(child) {
		walk_of(ast, rel, child)
	})
}

function assert(v) {
	if (!v) {
		debugger
		throw new Error('assert failed')
	}
}

function walk(ast, user_callout) {
	assert(ast)
	assert(type_handler[ast.type])

	if (user_callout) {
		if (!user_callout.enter) {
			user_callout.enter = function() {}
		}
		if (!user_callout.leave) {
			user_callout.leave = function() {}
		}
		callout = user_callout
	}

	callout.enter(ast, nav)
	type_handler[ast.type](ast, nav)
	callout.leave(ast, nav)
}

module.exports = exports = walk
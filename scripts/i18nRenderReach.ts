import { dirname, join, relative, sep } from "node:path";
import ts from "typescript";

export interface RenderReachViolation {
	file: string;
	line: number;
	text: string;
}

const LOCALE_READERS = new Set(["t", "i18n", "currentLocale"]);

const SYNCHRONOUS_CALLBACKS = new Set([
	"useAppStore",
	"useStore",
	"useMemo",
	"useState",
	"useReducer",
	"map",
	"flatMap",
	"filter",
	"reduce",
	"sort",
	"toSorted",
	"find",
	"findIndex",
	"findLast",
	"some",
	"every",
	"forEach",
	"from",
	"fromEntries",
	"entries",
]);

type FunctionNode =
	| ts.FunctionDeclaration
	| ts.FunctionExpression
	| ts.ArrowFunction
	| ts.MethodDeclaration
	| ts.GetAccessorDeclaration;

function isFunctionNode(node: ts.Node): node is FunctionNode {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isGetAccessorDeclaration(node)
	);
}

function functionName(node: FunctionNode): string | undefined {
	if (node.name && ts.isIdentifier(node.name)) return node.name.text;
	let parent: ts.Node = node.parent;
	while (ts.isCallExpression(parent) || ts.isParenthesizedExpression(parent))
		parent = parent.parent;
	if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
	return undefined;
}

function isComponentOrHook(node: FunctionNode): boolean {
	const name = functionName(node);
	return !!name && (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name));
}

function enclosingFunction(node: ts.Node): FunctionNode | undefined {
	for (let current = node.parent; current; current = current.parent) {
		if (isFunctionNode(current)) return current;
	}
	return undefined;
}

function calleeName(call: ts.CallExpression): string | undefined {
	const callee = call.expression;
	if (ts.isIdentifier(callee)) return callee.text;
	if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
	return undefined;
}

function runsSynchronouslyIn(fn: FunctionNode): boolean {
	const parent = fn.parent;
	if (ts.isCallExpression(parent) && parent.arguments.includes(fn as ts.Expression)) {
		const name = calleeName(parent);
		return !!name && SYNCHRONOUS_CALLBACKS.has(name);
	}
	return ts.isParenthesizedExpression(parent) && ts.isCallExpression(parent.parent);
}

function ownerWhenEvaluated(node: ts.Node): FunctionNode | undefined {
	let fn = enclosingFunction(node);
	while (fn && runsSynchronouslyIn(fn)) fn = enclosingFunction(fn);
	return fn;
}

function isGetterLike(node: ts.Node): node is FunctionNode {
	return (
		ts.isGetAccessorDeclaration(node) ||
		((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
			ts.isPropertyAssignment(node.parent) &&
			ts.isIdentifier(node.parent.name) &&
			node.parent.name.text === "get")
	);
}

export function renderReachViolations(
	repoRoot: string,
	tsconfigs: readonly string[],
): RenderReachViolation[] {
	const violations: RenderReachViolation[] = [];
	const seen = new Set<string>();
	for (const tsconfig of tsconfigs) {
		const configPath = join(repoRoot, tsconfig);
		const config = ts.readConfigFile(configPath, ts.sys.readFile);
		const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
		const program = ts.createProgram(parsed.fileNames, parsed.options);
		const checker = program.getTypeChecker();
		const resolve = (symbol: ts.Symbol | undefined): ts.Symbol | undefined =>
			symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

		const localeModule = program
			.getSourceFiles()
			.find((file) =>
				file.fileName.endsWith(["packages", "locales", "src", "react.tsx"].join("/")),
			);
		const moduleSymbol = localeModule ? checker.getSymbolAtLocation(localeModule) : undefined;
		if (!localeModule || !moduleSymbol) continue;
		const readers = new Set(
			checker
				.getExportsOfModule(moduleSymbol)
				.filter((symbol) => LOCALE_READERS.has(symbol.name))
				.map((symbol) => resolve(symbol)),
		);
		const sources = program
			.getSourceFiles()
			.filter(
				(file) =>
					!file.isDeclarationFile &&
					!file.fileName.includes("/node_modules/") &&
					!/\.(?:test|spec)\.tsx?$/.test(file.fileName) &&
					file !== localeModule,
			);

		const translatingFunctions = new Set<ts.Symbol>();
		const translatingValues = new Set<ts.Symbol>();
		const symbolOf = (node: ts.Node) => resolve(checker.getSymbolAtLocation(node));
		const isLocaleRead = (node: ts.Identifier): boolean => {
			const symbol = symbolOf(node);
			if (!symbol) return false;
			if (readers.has(symbol) || translatingValues.has(symbol)) return true;
			if (!translatingFunctions.has(symbol) || !ts.isCallExpression(node.parent)) return false;
			const call = node.parent;
			if (call.expression === node) return true;
			const name = calleeName(call);
			return !!name && SYNCHRONOUS_CALLBACKS.has(name) && call.arguments.includes(node);
		};
		const readsLocaleWhenCalled = (fn: FunctionNode): boolean => {
			let found = false;
			const visit = (node: ts.Node): void => {
				if (found) return;
				if (ts.isIdentifier(node) && ownerWhenEvaluated(node) === fn && isLocaleRead(node)) {
					found = true;
					return;
				}
				ts.forEachChild(node, visit);
			};
			if (fn.body) visit(fn.body);
			return found;
		};
		const functionSymbol = (fn: FunctionNode): ts.Symbol | undefined => {
			if (fn.name) return symbolOf(fn.name);
			let parent: ts.Node = fn.parent;
			while (ts.isCallExpression(parent) || ts.isParenthesizedExpression(parent))
				parent = parent.parent;
			return ts.isVariableDeclaration(parent) ? symbolOf(parent.name) : undefined;
		};

		let grew = true;
		while (grew) {
			grew = false;
			for (const file of sources) {
				const visit = (node: ts.Node): void => {
					if (isFunctionNode(node) && !isComponentOrHook(node) && !isGetterLike(node)) {
						const symbol = functionSymbol(node);
						if (symbol && !translatingFunctions.has(symbol) && readsLocaleWhenCalled(node)) {
							translatingFunctions.add(symbol);
							grew = true;
						}
					}
					if (isGetterLike(node) && readsLocaleWhenCalled(node)) {
						let holder: ts.Node = node;
						while (holder.parent && !ts.isVariableDeclaration(holder) && !ts.isSourceFile(holder)) {
							holder = holder.parent;
						}
						const symbol = ts.isVariableDeclaration(holder) ? symbolOf(holder.name) : undefined;
						if (symbol && !translatingValues.has(symbol)) {
							translatingValues.add(symbol);
							grew = true;
						}
					}
					ts.forEachChild(node, visit);
				};
				visit(file);
			}
		}

		for (const file of sources) {
			const visit = (node: ts.Node): void => {
				if (isGetterLike(node) && readsLocaleWhenCalled(node)) {
					const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
					violations.push({
						file: relative(repoRoot, file.fileName).split(sep).join("/"),
						line: line + 1,
						text: "translating getter",
					});
				}
				if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent)) {
					const owner = ownerWhenEvaluated(node);
					if (owner && isComponentOrHook(owner) && isLocaleRead(node)) {
						const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
						const key = `${file.fileName}:${line}:${node.text}`;
						if (!seen.has(key)) {
							seen.add(key);
							violations.push({
								file: relative(repoRoot, file.fileName).split(sep).join("/"),
								line: line + 1,
								text: node.text,
							});
						}
					}
				}
				ts.forEachChild(node, visit);
			};
			visit(file);
		}
	}
	return violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

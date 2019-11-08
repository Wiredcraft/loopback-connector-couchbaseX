ENV = NODE_ENV=test
BIN = ./node_modules/.bin
MOCHA = ./node_modules/.bin/_mocha
MOCHA_OPTS = -b --timeout 20000 --reporter spec --exit
ISTANBUL = ./node_modules/.bin/istanbul
COVERALLS = ./node_modules/.bin/coveralls
TESTS = test/*.test.js

install:
	@echo "Installing..."
	@npm install
	@npm prune
lint: lint-js
lint-js:
	@echo "Linting JavaScript..."
	@$(BIN)/eslint . --fix
test: lint
	@echo "Testing..."
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) $(TESTS)
test-cov: lint
	@echo "Testing..."
	@$(ENV) $(ISTANBUL) cover $(MOCHA) -- $(MOCHA_OPTS) $(TESTS)
send-coveralls:
	@cat ./coverage/lcov.info | $(COVERALLS) --verbose
test-coveralls: test-cov send-coveralls
.PHONY: install lint test test-cov send-coveralls test-coveralls

.PHONY: b benchmark benchmarks
b benchmark benchmarks:
	@node benchmarks >> $(CURDIR)/benchmarks/results.md \
		&& echo 'Done. See ./benchmarks/results.md'

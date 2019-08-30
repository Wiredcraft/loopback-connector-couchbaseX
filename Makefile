ENV = NODE_ENV=test DEBUG=loopback:connector:*
BIN = ./node_modules/.bin
MOCHA = ./node_modules/.bin/_mocha
MOCHA_OPTS = -b --timeout 20000 --reporter spec --exit
ISTANBUL = ./node_modules/.bin/istanbul
COVERALLS = ./node_modules/.bin/coveralls

install:
	@echo "Installing..."
	@npm install
	@npm prune
lint: lint-js
lint-js:
	@echo "Linting JavaScript..."
	@$(BIN)/eslint . --fix
docker-up-cb5:
	@./dockers/up.sh cb5
test-cb5:
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) test/cb5.test.js
docker-up-cb4:
	@./dockers/up.sh cb4
test-cb4:
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) test/cb4.test.js
test: lint
	@echo "Testing..."
	@./dockers/up.sh cb5
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) test/cb5.test.js
	@./dockers/down.sh cb5
	@./dockers/up.sh cb4
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) test/cb4.test.js
	@./dockers/down.sh cb4
test-cov: lint
	@echo "Testing..."
	@./dockers/up.sh cb5
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) test/cb5.test.js
	@./dockers/down.sh cb5
	@./dockers/up.sh cb4
	@$(ENV) $(MOCHA) $(MOCHA_OPTS) test/cb4.test.js
	@./dockers/down.sh cb4
send-coveralls:
	@cat ./coverage/lcov.info | $(COVERALLS) --verbose
test-coveralls: test-cov send-coveralls
.PHONY: install lint test test-cov send-coveralls test-coveralls

.PHONY: b benchmark benchmarks
b benchmark benchmarks:
	@node benchmarks >> $(CURDIR)/benchmarks/results.md \
		&& echo 'Done. See ./benchmarks/results.md'

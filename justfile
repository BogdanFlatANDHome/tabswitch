set shell := ["bash", "-euo", "pipefail", "-c"]

# Playwright берём из глобального @playwright/cli — отдельно ставить не нужно
export NODE_PATH := `npm root -g` + "/@playwright/cli/node_modules"

default:
    @just --list

# Поведенческие тесты: Chromium с расширением, вкладки, команда «открыть переключатель», клавиатура
test:
    node --test --test-concurrency=1 tests/*.test.mjs

# Синтаксис всех js-файлов
lint:
    for f in *.js tests/*.mjs tools/*.mjs; do node --check "$f"; done
    python3 -m json.tool manifest.json >/dev/null

# lint + test
check: lint test

# После правок кода: Chrome подхватит новую версию на следующем Alt+Q (первый Alt+Q только перезагрузит расширение)
reload:
    date +%s%N > stamp.txt && echo "метка обновлена — нажми Alt+Q в Chrome два раза"

# Значки icons/icon-*.png из icons/src/layers.svg (Lucide, ISC)
icons:
    node tools/icons.mjs

# Скриншоты для магазина 1280×800 (тёмная и светлая тема) → store/
screens:
    node tools/screens.mjs

# Архив для Chrome Web Store: только то, что нужно расширению (без тестов, инструментов, метки разработки)
pack: check
    rm -f tabswitch.zip && zip -qr tabswitch.zip manifest.json *.js *.html _locales icons/icon-*.png && unzip -l tabswitch.zip | tail -1

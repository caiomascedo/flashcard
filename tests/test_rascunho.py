"""Real bundled Excalidraw, isolated cloud, browser drawing and persistence."""
import re
import pytest
from playwright.sync_api import sync_playwright, expect
from test_caderno_integrado import MOCK, server


@pytest.mark.parametrize('engine,width', [('chromium', 1280), ('chromium', 390), ('webkit', 390)])
def test_lazy_drawing_and_restore(server, engine, width):
    with sync_playwright() as p:
        browser = getattr(p, engine).launch()
        page = browser.new_page(viewport={'width': width, 'height': 844})
        page.set_default_timeout(15000)
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url) if '/rascunho/' in request.url else None)
        page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js', lambda route: route.fulfill(body=MOCK, content_type='application/javascript'))
        page.route('https://i.postimg.cc/**', lambda route: route.abort())
        page.goto(server)
        page.wait_for_function('!!window.FlashcardCaderno?.pronto')
        page.wait_for_function("!!document.getElementById('cadernoIntegradoFrame')?.contentWindow?.CadernoIntegrado")
        assert not requests
        page.locator('#modoFocoBtn').click()
        page.get_by_role('button', name='✏️ Rascunho', exact=True).click()
        dialog = page.locator('#rascunhoFlashcard')
        expect(dialog).to_be_visible()
        frame = page.frame_locator('#rascunhoFlashcard iframe')
        canvas = frame.locator('canvas.excalidraw__canvas.interactive')
        expect(canvas).to_be_visible()
        frame.locator('[data-testid="toolbar-freedraw"]').wait_for()
        bounds = canvas.bounding_box()
        assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= width + 1
        # Draw a line through the actual canvas, not a mocked editor API.
        page.mouse.move(bounds['x'] + bounds['width'] * .4, bounds['y'] + bounds['height'] * .5)
        page.mouse.down()
        page.mouse.move(bounds['x'] + bounds['width'] * .7, bounds['y'] + bounds['height'] * .6, steps=12)
        page.mouse.up()
        expect(dialog.locator('[role="status"]')).to_have_text('Salvo neste navegador')
        drawing_frame = next(f for f in page.frames if '/rascunho/index.html' in f.url)
        read = '''async () => {
          const db = await new Promise((resolve,reject)=>{const r=indexedDB.open('flashcard-rascunho',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
          return await new Promise(resolve=>{const r=db.transaction('desenhos').objectStore('desenhos').get('principal');r.onsuccess=()=>resolve(r.result)});
        }'''
        saved = drawing_frame.evaluate(read)
        assert len(saved['elements']) == 1
        assert saved['elements'][0]['type'] == 'freedraw'
        element_id = saved['elements'][0]['id']
        normal = dialog.bounding_box()
        page.get_by_role('button', name='⤢ Expandir', exact=True).click()
        expect(dialog.locator('.rascunho-expandir')).to_have_attribute('aria-pressed', 'true')
        assert dialog.bounding_box() == pytest.approx({'x': 0, 'y': 0, 'width': width, 'height': 844}, abs=.1)
        assert canvas.bounding_box()['height'] > bounds['height']
        assert drawing_frame.evaluate(read)['elements'][0]['id'] == element_id
        page.get_by_role('button', name='⤡ Reduzir', exact=True).click()
        expect(dialog.locator('.rascunho-expandir')).to_have_attribute('aria-pressed', 'false')
        assert dialog.bounding_box() == normal
        # Theme switches immediately, keeps the drawing and survives a reload.
        theme = dialog.get_by_label('Tema do rascunho')
        theme.select_option('dark')
        expect(frame.locator('.excalidraw')).to_have_class(re.compile('theme--dark'))
        assert page.evaluate("localStorage.getItem('flashcard-rascunho-tema')") == 'dark'
        expect(dialog.locator('[role="status"]')).to_have_text('Salvo neste navegador')
        assert drawing_frame.evaluate(read)['elements'][0]['id'] == element_id
        page.get_by_role('button', name='📚 Salvar na biblioteca', exact=True).click()
        expect(frame.locator('.Toast')).to_contain_text('salvo na biblioteca')
        library_read = read.replace("get('principal')", "get('biblioteca')")
        library = drawing_frame.evaluate(library_read)
        assert len(library) == 1 and library[0]['elements'][0]['id'] == element_id
        page.get_by_role('button', name='Voltar aos cards', exact=True).click()
        expect(dialog).not_to_be_visible()
        assert page.evaluate('statusCard.every(s => s === "nao")')
        page.get_by_role('button', name='✏️ Rascunho', exact=True).click()
        assert sum('/rascunho/index.html' in url for url in requests) == 1
        page.get_by_role('button', name='Voltar aos cards', exact=True).click()
        page.reload()
        page.get_by_role('button', name='✏️ Rascunho', exact=True).click()
        expect(frame.locator('canvas.excalidraw__canvas.interactive')).to_be_visible()
        expect(theme).to_have_value('dark')
        expect(frame.locator('.excalidraw')).to_have_class(re.compile('theme--dark'))
        expect(dialog.locator('[role="status"]')).to_have_text('Salvo neste navegador')
        drawing_frame = next(f for f in page.frames if '/rascunho/index.html' in f.url)
        assert drawing_frame.evaluate(read)['elements'][0]['id'] == element_id
        restored_library = drawing_frame.evaluate(library_read)
        assert len(restored_library) == 1 and restored_library[0]['id'] == library[0]['id']
        frame.get_by_title('Biblioteca', exact=True).click()
        library_item = frame.locator('.library-unit__dragger svg').first
        expect(library_item).to_be_visible()
        frame.locator('.library-unit__dragger').first.click()
        area = canvas.bounding_box()
        page.mouse.click(area['x'] + area['width'] * .55, area['y'] + area['height'] * .65)
        expect(dialog.locator('[role="status"]')).to_have_text('Salvo neste navegador')
        assert len(drawing_frame.evaluate(read)['elements']) == 2
        theme.select_option('light')
        expect(frame.locator('.excalidraw')).not_to_have_class(re.compile('theme--dark'))
        assert len(page.context.pages) == 1
        assert not errors, errors
        browser.close()

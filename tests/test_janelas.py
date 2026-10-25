"""Move/resize both real iframe dialogs, preserving their full-screen controls."""
import pytest
from playwright.sync_api import sync_playwright, expect
from test_caderno_integrado import MOCK, server


@pytest.mark.parametrize('engine,width', [('chromium',1280),('webkit',1280),('webkit',390)])
def test_windows_mouse_resize_and_move(server, engine, width):
    with sync_playwright() as p:
        browser = getattr(p, engine).launch()
        page = browser.new_page(viewport={'width':width, 'height':844})
        page.set_default_timeout(12000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/dist/umd/supabase.min.js', lambda route:route.fulfill(body=MOCK,content_type='application/javascript'))
        page.route('https://i.postimg.cc/**', lambda route:route.abort())
        page.goto(server)
        page.wait_for_function('!!window.FlashcardCaderno?.pronto')
        for title, selector, maximize, restore, close in [
            ('✏️ Rascunho','#rascunhoFlashcard','.rascunho-expandir','.rascunho-expandir','[aria-label="Voltar aos cards"]'),
            ('📓 Caderno completo','#cadernoIntegradoDialog','#cadernoIntegradoExpandir','#cadernoIntegradoExpandir','#cadernoIntegradoFechar'),
        ]:
            page.get_by_role('button',name=title,exact=True).click()
            dialog = page.locator(selector)
            expect(dialog).to_be_visible()
            original = dialog.bounding_box()
            grip = dialog.get_by_role('button',name='Redimensionar janela',exact=True)
            box = grip.bounding_box()
            page.mouse.move(box['x'] + box['width']/2,box['y'] + box['height']/2)
            page.mouse.down()
            page.mouse.move(box['x'] - 140,box['y'] - 170,steps=8)
            page.mouse.up()
            resized = dialog.bounding_box()
            assert resized['height'] < original['height'] - 100
            assert resized['width'] < original['width'] - 20
            mover = dialog.get_by_role('button',name='Mover janela',exact=True)
            box = mover.bounding_box()
            page.mouse.move(box['x'] + box['width']/2,box['y'] + box['height']/2)
            page.mouse.down()
            page.mouse.move(box['x'] + box['width']/2 + 25,box['y'] + box['height']/2 + 60,steps=8)
            page.mouse.up()
            moved = dialog.bounding_box()
            assert moved['x'] > resized['x'] + 10 and moved['y'] > resized['y'] + 40
            assert moved['width'] == pytest.approx(resized['width'],abs=.1)
            assert moved['height'] == pytest.approx(resized['height'],abs=.1)
            assert not dialog.evaluate('el=>el.classList.contains("janela-manipulando")')
            dialog.locator(maximize).click()
            assert dialog.bounding_box() == pytest.approx({'x':0,'y':0,'width':width,'height':844},abs=.1)
            expect(grip).not_to_be_visible()
            dialog.locator(restore).click()
            assert dialog.bounding_box() == pytest.approx(moved,abs=.1)
            # Native keyboard controls cannot accidentally grade/navigate cards.
            mover.focus()
            page.keyboard.press('ArrowDown')
            assert dialog.bounding_box()['y'] == pytest.approx(moved['y']+10,abs=.1)
            # Moving far offscreen is clamped, keeping controls reachable.
            box = mover.bounding_box()
            page.mouse.move(box['x'] + box['width']/2,box['y'] + box['height']/2)
            page.mouse.down()
            page.mouse.move(-1000,-1000,steps=5)
            page.mouse.up()
            assert dialog.bounding_box()['x'] == pytest.approx(0,abs=.1)
            assert dialog.bounding_box()['y'] == pytest.approx(0,abs=.1)
            dialog.locator(close).click()
            expect(dialog).not_to_be_visible()
        assert not errors,errors
        browser.close()

"""Respostas PostgREST reais por contrato, sem acessar a base remota."""
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


class RemoteResponse(unittest.TestCase):
    def response(self, name, status, body):
        response = io.BytesIO(body)
        response.status = status
        with patch.object(server, 'URL', 'https://example.supabase.co'), patch.object(server, 'KEY', 'sb_publishable_test'), patch.object(server, 'urlopen', return_value=response):
            return server.remote('/rest/v1/rpc/' + name, {}, 'test-user-token')

    def test_void_changes_accept_204(self):
        for name in ('tectria_admin_product', 'tectria_admin_suspend_company', 'tectria_admin_contract', 'tectria_admin_module', 'tectria_module_settings', 'tectria_manage_member', 'tectria_manage_product_access'):
            with self.subTest(name=name):
                self.assertIsNone(self.response(name, 204, b''))

    def test_read_and_company_creation_require_content(self):
        for name in ('tectria_context', 'tectria_panel_company', 'tectria_panel_history', 'tectria_admin_company'):
            with self.subTest(name=name), self.assertRaises(server.Unavailable):
                self.response(name, 204, b'')

    def test_json_read_is_preserved(self):
        self.assertEqual(self.response('tectria_panel_company', 200, b'{"products":[]}'), {'products': []})

    def test_malformed_change_does_not_confirm_success(self):
        with self.assertRaisesRegex(server.Unavailable, 'Atualize os dados'):
            self.response('tectria_admin_product', 200, b'<html>failure</html>')

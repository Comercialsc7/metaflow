import unittest

from api_server import create_app


class ApiServerTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_health_endpoint(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['sucesso'])
        self.assertIn('mensagem', payload)

    def test_web_distribution_route(self):
        payload = {
            'estrutura': {
                'FORNECEDOR_1': [
                    {'media': 1000, 'historico': 1200, 'equipe': 'EQ1', 'vendedor': 'V1'},
                    {'media': 500, 'historico': 600, 'equipe': 'EQ2', 'vendedor': 'V2'},
                ]
            },
            'metas': {'FORNECEDOR_1': 5000},
            'peso_media': 0.5,
            'peso_historico': 0.5,
            'bloco': 500,
        }

        response = self.client.post('/web/metas/distribuir', json=payload)
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['sucesso'])
        self.assertIn('distribuicao', payload)


if __name__ == '__main__':
    unittest.main()

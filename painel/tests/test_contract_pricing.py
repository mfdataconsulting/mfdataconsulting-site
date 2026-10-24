import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

class ContractPricingTests(unittest.TestCase):
    def payload(self,**changes):
        data={'company_id':'b1000000-0000-0000-0000-000000000001','contract_products':['nexo','lume','pulso'],
            'discount_type':'none','state':'draft','business_profile':'commerce','reason':'Teste de composição'}
        data.update(changes)
        return server.mutation('contract',data)[1]
    def test_totals_and_rounding(self):
        self.assertEqual(self.payload()['p_monthly'],22970)
        self.assertEqual(self.payload(discount_type='amount',discount_value='29,70')['p_monthly'],20000)
        self.assertEqual(self.payload(discount_type='percent',discount_value='10')['p_monthly'],20673)
        self.assertEqual(self.payload(contract_products=['nexo'],monthly='1')['p_monthly'],8990)
        self.assertEqual(self.payload(discount_type='percent',discount_value='100')['p_monthly'],0)
    def test_mobile_price_is_explicit_and_existing_prices_preserved(self):
        with self.assertRaises(ValueError):self.payload(contract_products=['nexo_mobile'])
        result=self.payload(contract_products=['nexo_mobile'],mobile_monthly='49,90')
        self.assertEqual(result['p_monthly'],4990)
        self.assertEqual(result['p_limits']['pricing']['prices_cents'],{'nexo_mobile':4990})
        self.assertEqual(self.payload(contract_products=['nexo','nexo_mobile'],mobile_monthly='49,90')['p_monthly'],13980)
    def test_invalid_composition_and_discount(self):
        for changes in ({'contract_products':[]},{'contract_products':['nexo','nexo']},{'contract_products':['atlas']},
                        {'discount_type':'percent','discount_value':'101'},{'discount_type':'amount','discount_value':'230'},
                        {'discount_type':'amount','discount_value':'-1'}):
            with self.assertRaises(ValueError):self.payload(**changes)

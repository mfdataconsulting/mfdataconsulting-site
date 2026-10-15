/* Business profile catalog; operational activation is separate. */
window.TectriaBusinessProfiles = {
  "schemaVersion": 1,
  "profiles": [
    {
      "code": "commerce",
      "label": "Comércio em geral",
      "operationalScenario": "commerce",
      "status": "available_local"
    },
    {
      "code": "perfumes",
      "label": "Perfumaria e cosméticos",
      "operationalScenario": "commerce",
      "status": "available_local"
    },
    {
      "code": "restaurant",
      "label": "Bar e restaurante",
      "operationalScenario": "restaurant",
      "status": "available_local"
    },
    {
      "code": "party_decoration",
      "label": "Decoração de festas infantis",
      "status": "provisioned_pending_implementation",
      "operationalScenario": "events_and_rentals",
      "operation": "service_and_rental",
      "automaticActivation": false,
      "configuration": {
        "customerType": "responsible_customer",
        "eventTimezone": "America/Sao_Paulo",
        "payment": "deposit_and_remaining_balance",
        "depositAmountRequired": false,
        "allowPartialReceipts": true,
        "stockTypes": [
          "consumable",
          "reusable_asset"
        ],
        "debitReusableAssetsOnSale": false,
        "reserveReusableAssetsByPeriod": true,
        "reservationWindow": "collection_or_setup_until_return_and_release",
        "overbookingAllowed": false,
        "returnInspectionRequired": true,
        "releaseWithoutInspection": false,
        "restorePreviousEventsOnScenarioChange": false
      },
      "existingReusableResources": [
        "customers",
        "payables",
        "receipt_ledger_patterns",
        "partial_payment_patterns",
        "stock_consumables",
        "barcode_reading",
        "Lume_tasks_and_push",
        "Pulso_reports"
      ],
      "pendingCapabilities": [
        "service_catalog",
        "event_quotes",
        "event_schedule",
        "rental_asset_catalog",
        "atomic_period_reservations",
        "event_receivables",
        "delivery_and_return",
        "damage_and_missing_items",
        "event_costs_and_margin",
        "event_notification_rules",
        "Atlas_profile_distribution"
      ],
      "guidance": "Perfil preparado para serviço e aluguel. Agenda, reservas, locações e devoluções ainda precisam ser implementadas no Nexo. Selecionar este ramo não habilita essas funções nem altera o cenário de vendas existente."
    }
  ]
};

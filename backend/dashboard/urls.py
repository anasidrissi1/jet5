from django.urls import path
from . import views

urlpatterns = [
     path('', views.dashboard_stats, name='admin_dashboard'),
     path('all-stats/', views.dashboard_all_stats, name='dashboard_all_stats'),
     path('retours-aujourdhui/', views.retours_aujourdhui, name='retours_aujourdhui'),
     path('timeline-aujourdhui/', views.timeline_aujourdhui, name='timeline_aujourdhui'),
     path('cash-flow/', views.cash_flow, name='cash_flow'),
     path('search/', views.global_search, name='global_search'),

     # Contact public
     path('contact/', views.public_contact, name='public_contact'),
     path('contact/messages/', views.contact_messages_list, name='contact_messages_list'),
     path('contact/messages/<int:pk>/read/', views.contact_message_mark_read, name='contact_message_mark_read'),
     
     # Nouveaux endpoints pour dashboard simplifié
     path('finances-mensuelles/', views.finances_mensuelles, name='finances_mensuelles'),
     path('retours-aujourdhui-simple/', views.retours_aujourdhui_simple, name='retours_aujourdhui_simple'),
     path('alertes-urgentes/', views.alertes_urgentes, name='alertes_urgentes'),
     path('paiements-en-attente/', views.paiements_en_attente, name='paiements_en_attente'),
]

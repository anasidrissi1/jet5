from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from .models import Notification
from .serializers import NotificationSerializer
from .utils import generer_toutes_notifications

logger = logging.getLogger(__name__)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by('-urgence', '-date_creation')
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    
    @action(detail=False, methods=['post'])
    def generer(self, request):
        """Génère toutes les notifications automatiques"""
        try:
            generer_toutes_notifications()
            return Response({
                'success': True,
                'message': 'Notifications générées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception('Notification generation failed: %s', exc)
            return Response({
                'success': False,
                'message': 'Failed to generate notifications'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Retourne les statistiques des notifications"""
        total = Notification.objects.count()
        non_lues = Notification.objects.filter(est_lue=False).count()
        urgentes = Notification.objects.filter(urgence=True).count()
        
        par_type = {}
        for type_code, type_label in Notification.TYPE_CHOICES:
            count = Notification.objects.filter(type=type_code).count()
            par_type[type_code] = {
                'label': type_label,
                'count': count
            }
        
        return Response({
            'total': total,
            'non_lues': non_lues,
            'urgentes': urgentes,
            'par_type': par_type
        })



from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "reservation", "amount", "status", "method", "paid_at", "created_at")
    list_filter = ("status", "method", "created_at")
    search_fields = ("reservation__id", "reservation__user__email",)

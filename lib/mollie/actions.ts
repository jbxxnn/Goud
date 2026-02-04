import mollieClient from '@/lib/mollie/client';

export async function processRefundOrCancel(paymentId: string, amount: number) {
    try {
        const payment = await mollieClient.payments.get(paymentId);

        if (payment.isPaid()) {
            const remaining = parseFloat(payment.amountRemaining?.value || '0');
            if (remaining <= 0) {
                console.log('[Mollie] Payment already refunded');
                return 'already_refunded';
            }

            // Refund
            await mollieClient.paymentRefunds.create({
                paymentId,
                amount: {
                    currency: 'EUR',
                    value: (amount / 100).toFixed(2),
                },
                description: `Refund initiated via Dashboard`,
            });
            console.log('[Mollie] Refund initiated');
            return 'refund_initiated';

        } else if (payment.isCancelable()) {
            // Cancel the payment
            await mollieClient.payments.cancel(paymentId);
            console.log('[Mollie] Payment cancelled');
            return 'payment_cancelled';

        } else {
            console.log('[Mollie] Payment status:', payment.status, '- cannot refund or cancel');
            return 'no_action'; // e.g. already canceled, expired, or failed
        }

    } catch (error) {
        console.error('[Mollie] Action failed:', error);
        throw error;
    }
}

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { DELIVERY_TYPES } from '@/types/delivery';

interface PackageReceiptProps {
  pkg: {
    trackingNumber: string;
    senderName: string;
    senderPhone: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    deliveryType: string;
    pickupPoint?: string | null;
    packageDescription?: string | null;
    cost: number;
    createdAt: Date;
    paymentStatus?: string;
    mpesaReceiptNumber?: string | null;
  };
}

export const PackageReceipt = forwardRef<HTMLDivElement, PackageReceiptProps>(
  ({ pkg }, ref) => {
    const getDeliveryTypeName = (type: string) => {
      return DELIVERY_TYPES.find((t) => t.id === type)?.name || type;
    };

    return (
      <div 
        ref={ref}
        className="bg-white p-6 max-w-[320px] mx-auto text-black"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <h1 className="text-xl font-bold">CANYI DELIVERY</h1>
          <p className="text-xs text-gray-600">Delivery Receipt</p>
          <p className="text-xs text-gray-600">{format(new Date(), 'PPpp')}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-2 rounded">
            <QRCodeSVG 
              value={pkg.trackingNumber}
              size={100}
              level="H"
            />
          </div>
        </div>

        {/* Tracking Number */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-600">Tracking Number</p>
          <p className="font-bold text-lg">{pkg.trackingNumber}</p>
        </div>

        {/* Details */}
        <div className="border-t border-b border-dashed border-gray-300 py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">From:</span>
            <span className="font-medium text-right max-w-[180px]">{pkg.senderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span>{pkg.senderPhone}</span>
          </div>
          <div className="border-t border-dashed border-gray-200 my-2" />
          <div className="flex justify-between">
            <span className="text-gray-600">To:</span>
            <span className="font-medium text-right max-w-[180px]">{pkg.receiverName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span>{pkg.receiverPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Address:</span>
            <span className="text-right max-w-[180px]">{pkg.receiverAddress}</span>
          </div>
          {pkg.pickupPoint && (
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup:</span>
              <span className="text-right max-w-[180px]">{pkg.pickupPoint}</span>
            </div>
          )}
          <div className="border-t border-dashed border-gray-200 my-2" />
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span>{getDeliveryTypeName(pkg.deliveryType)}</span>
          </div>
          {pkg.packageDescription && (
            <div className="flex justify-between">
              <span className="text-gray-600">Package:</span>
              <span className="text-right max-w-[180px]">{pkg.packageDescription}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span>{format(pkg.createdAt, 'dd/MM/yyyy HH:mm')}</span>
          </div>
          {pkg.mpesaReceiptNumber && (
            <div className="flex justify-between">
              <span className="text-gray-600">M-Pesa:</span>
              <span>{pkg.mpesaReceiptNumber}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="py-4 border-b border-dashed border-gray-300">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">TOTAL:</span>
            <span className="text-xl font-bold">KES {pkg.cost.toLocaleString()}</span>
          </div>
          {pkg.paymentStatus && (
            <div className="flex justify-between mt-1">
              <span className="text-gray-600 text-sm">Status:</span>
              <span className={`text-sm font-medium ${
                pkg.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
              }`}>
                {pkg.paymentStatus.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 text-xs text-gray-600">
          <p>Thank you for choosing Canyi Delivery!</p>
          <p className="mt-1">For inquiries: +254701430225</p>
          <p className="mt-2 text-[10px]">Keep this receipt for your records</p>
        </div>
      </div>
    );
  }
);

PackageReceipt.displayName = 'PackageReceipt';

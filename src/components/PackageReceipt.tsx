import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { DELIVERY_TYPES } from '@/types/delivery';

interface PackageReceiptProps {
  pkg: {
    trackingNumber: string;
    senderName: string;
    senderPhone: string;
    senderAddress?: string | null;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    deliveryType: string;
    pickupPoint?: string | null;
    packageDescription?: string | null;
    packageValue?: number | null;
    weight?: number | null;
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

    const taxable = Math.round((pkg.cost / 1.16) * 100) / 100;
    const tax = Math.round((pkg.cost - taxable) * 100) / 100;

    return (
      <div 
        ref={ref}
        className="bg-white p-4 max-w-[380px] mx-auto text-black"
        style={{ fontFamily: 'monospace', fontSize: '11px', width: '380px' }}
      >
        {/* Header */}
        <div className="text-center border-b border-black pb-3 mb-3">
          <h1 className="text-xl font-bold tracking-wider">SWIFTDROP</h1>
          <p className="text-[10px] mt-1">Fast & Reliable Delivery</p>
          <p className="text-[10px]">TEL: +254114606020</p>
        </div>

        {/* Parcel Info */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="text-[10px]">PARCEL NO: <span className="font-bold">{pkg.trackingNumber}</span></p>
          <p className="text-[10px]">TOTAL ITEMS: 1</p>
        </div>

        {/* Sender Details */}
        <div className="border border-black mb-3">
          <div className="flex">
            <div className="flex-1 p-2 border-r border-black">
              <p className="font-bold text-[11px] mb-1">SENDER DETAILS</p>
              <p>{pkg.senderName}</p>
              {pkg.senderAddress && <p className="text-[10px]">{pkg.senderAddress}</p>}
            </div>
            <div className="p-2 flex flex-col items-center justify-center w-20">
              <p className="text-[10px] font-bold">PRIORITY</p>
              <p className="text-2xl font-bold">A</p>
            </div>
          </div>
        </div>

        {/* Receiver Details with QR */}
        <div className="border border-black mb-3">
          <div className="flex">
            <div className="p-2 flex items-center justify-center border-r border-black">
              <QRCodeSVG 
                value={pkg.trackingNumber}
                size={64}
                level="H"
              />
            </div>
            <div className="flex-1 p-2">
              <p className="font-bold text-[11px] mb-1">RECEIVER DETAILS</p>
              <p>{pkg.receiverName}</p>
              <p className="text-[10px]">{pkg.receiverAddress}</p>
              {pkg.pickupPoint && (
                <p className="text-[10px]">{pkg.pickupPoint}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tracking & Type */}
        <div className="flex justify-between items-center mb-3">
          <p className="font-bold text-sm">{pkg.trackingNumber}</p>
          <span className="text-[10px] uppercase">{getDeliveryTypeName(pkg.deliveryType)}</span>
        </div>

        {/* Quantity & Weight */}
        <div className="flex justify-between items-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <div>
            <p className="text-[10px]">Quantity: 1</p>
            {pkg.packageValue != null && <p className="text-[10px]">Value: {pkg.packageValue.toLocaleString()} KES</p>}
            {pkg.packageDescription && <p className="text-[10px]">Desc: {pkg.packageDescription}</p>}
          </div>
          <div className="border border-black px-3 py-1 text-center">
            <p className="font-bold">{pkg.weight ?? 0} KG</p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="border border-black mb-3">
          <table className="w-full text-[11px]">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1 border-r border-black" rowSpan={2}>
                  <span className="font-bold">{pkg.paymentStatus === 'paid' ? 'PAID' : 'CASH'}</span>
                </td>
                <td className="p-1 border-r border-black text-right font-bold">TAXABLE</td>
                <td className="p-1 text-right">{taxable.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1 border-r border-black text-right font-bold">TAX (16%)</td>
                <td className="p-1 text-right">{tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-1 border-r border-black"></td>
                <td className="p-1 border-r border-black text-right font-bold">TOTAL</td>
                <td className="p-1 text-right font-bold">{pkg.cost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* M-Pesa receipt if available */}
        {pkg.mpesaReceiptNumber && (
          <div className="text-center text-[10px] mb-3">
            <p>M-Pesa Ref: <span className="font-bold">{pkg.mpesaReceiptNumber}</span></p>
          </div>
        )}

        {/* Terms */}
        <div className="border border-black p-2 mb-3 text-[9px]">
          <p className="font-bold text-center text-[10px] mb-1">TERMS & CONDITIONS</p>
          <p>You MUST declare parcel VALUE. Above Ksh.5000 to be insured by SENDER. Compensation is up to Ksh.5000. Perishable & Fragile not compensated. FRAGILE ITEMS SENT AT OWNERS RISK</p>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] mb-3">
          <p>Printed on: {format(new Date(), 'dd MMM yyyy hh:mm a')}</p>
        </div>

        {/* Invoice QR */}
        <div className="text-center border-t border-dashed border-gray-400 pt-3">
          <p className="text-[10px] font-bold mb-2">INVOICE NO.</p>
          <div className="flex justify-center">
            <QRCodeSVG 
              value={pkg.trackingNumber}
              size={80}
              level="H"
            />
          </div>
          <p className="text-[9px] mt-2">POWERED BY SWIFTDROP</p>
        </div>
      </div>
    );
  }
);

PackageReceipt.displayName = 'PackageReceipt';

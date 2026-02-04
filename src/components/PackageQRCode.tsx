import { QRCodeSVG } from 'qrcode.react';

interface PackageQRCodeProps {
  trackingNumber: string;
  size?: number;
}

export function PackageQRCode({ trackingNumber, size = 120 }: PackageQRCodeProps) {
  return (
    <div className="bg-white p-3 rounded-lg inline-block">
      <QRCodeSVG 
        value={trackingNumber}
        size={size}
        level="H"
        includeMargin={false}
      />
      <p className="text-xs text-center mt-2 font-mono text-gray-700">{trackingNumber}</p>
    </div>
  );
}

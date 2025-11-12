import amexLogo from '../assets/logos/amex.svg';
import mastercardLogo from '../assets/logos/mastercard.svg';
import visaLogo from '../assets/logos/visa.svg';

const LOGOS = [
  { label: 'Visa', src: visaLogo },
  { label: 'Mastercard', src: mastercardLogo },
  { label: 'American Express', src: amexLogo },
];

export function PaymentLogos() {
  return (
    <div className="flex items-center gap-2">
      {LOGOS.map((logo) => (
        <div
          key={logo.label}
          className="flex h-8 w-12 items-center justify-center rounded border border-[#E5E7EB] bg-white p-1"
        >
          <img className="h-full w-full object-contain" src={logo.src} alt={logo.label} loading="lazy" />
        </div>
      ))}
    </div>
  );
}


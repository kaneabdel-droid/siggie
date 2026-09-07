'use client'

import { Printer } from 'lucide-react'

export default function PrintSectionButton({ sectionId, label }: { sectionId: string, label: string }) {
  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #${sectionId}, #${sectionId} * {
          visibility: visible;
        }
        #${sectionId} {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        /* Masquer le bouton imprimer lui-même pendant l'impression */
        #${sectionId} button {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  }

  return (
    <button 
      onClick={handlePrint}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-md bg-surface border border-surface-border px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-background transition-colors"
    >
      <Printer className="h-4 w-4 text-foreground-muted" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

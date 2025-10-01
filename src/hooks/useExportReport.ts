import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
}

export const useExportReport = () => {
  const exportToPDF = useCallback(async (
    elementId: string, 
    options: ExportOptions
  ) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Elemento não encontrado para exportação');
      }

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);

      // Adicionar título
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(options.title, pageWidth / 2, 20, { align: 'center' });
      
      let currentY = 30;
      if (options.subtitle) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(options.subtitle, pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
      }

      // Função para adicionar nova página
      const addNewPage = () => {
        pdf.addPage();
        currentY = margin;
      };

      // Função para verificar se precisa de nova página
      const needsNewPage = (requiredHeight: number) => {
        return (currentY + requiredHeight) > (pageHeight - margin);
      };

      // Função para capturar elemento específico
      const captureElement = async (element: HTMLElement) => {
        return await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: element.scrollWidth,
          height: element.scrollHeight,
        });
      };

      // Função para adicionar seção com quebra de página inteligente
      const addSectionWithPageBreak = async (sectionElement: HTMLElement, sectionTitle?: string) => {
        // Verificar se precisa de nova página para o título
        if (sectionTitle && needsNewPage(15)) {
          addNewPage();
        }

        // Adicionar título da seção se fornecido
        if (sectionTitle) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sectionTitle, margin, currentY);
          currentY += 10;
        }

        // Capturar a seção
        const canvas = await captureElement(sectionElement);
        const imgData = canvas.toDataURL('image/png');
        
        // Calcular altura da imagem
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        // Verificar se precisa de nova página para a imagem
        if (needsNewPage(imgHeight + 10)) {
          addNewPage();
        }

        // Adicionar imagem
        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 15;
      };

      // Dividir o relatório em seções para melhor controle de quebra de página
      const sections = element.querySelectorAll('.space-y-6 > *');
      
      if (sections.length > 0) {
        // Processar cada seção individualmente
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement;
          
          // Determinar título da seção baseado no conteúdo
          let sectionTitle = '';
          const heading = section.querySelector('h2, h3, h4');
          if (heading) {
            sectionTitle = heading.textContent || '';
          }

          await addSectionWithPageBreak(section, sectionTitle);
        }
      } else {
        // Fallback: capturar elemento inteiro
        const canvas = await captureElement(element);
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        if (needsNewPage(imgHeight)) {
          addNewPage();
        }
        
        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
      }

      // Salvar PDF
      pdf.save(`${options.filename}.pdf`);
      
      return true;
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }, []);

  return { exportToPDF };
};

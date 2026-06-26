/**
 * HTML to ESC/POS Compiler for 58mm (32-column) Thermal Printers.
 * Parses custom HTML-based receipt structures and converts them directly to high-fidelity ESC/POS byte commands
 * to be processed natively on Android.
 */

import { ESC_POS_COMMANDS, stringToBytes, formatKeyValue } from './escPosGenerator';

// Constants
const LF = 0x0A;

export function convertHtmlToEscPos(htmlString: string, maxCols = 32): Uint8Array {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const buffer: number[] = [];

  // Local state tracking
  let isBold = false;
  let alignment: 'left' | 'center' | 'right' = 'left';
  let fontSize: 'normal' | 'large' | 'double_width' | 'double_height' = 'normal';

  // Output operations
  const write = (bytes: number[]) => {
    buffer.push(...bytes);
  };

  const writeBytes = (bytes: Uint8Array) => {
    for (let i = 0; i < bytes.length; i++) {
      buffer.push(bytes[i]);
    }
  };

  // Helper to sync formatting state
  const syncFormatting = (
    targetBold: boolean,
    targetAlign: 'left' | 'center' | 'right',
    targetSize: typeof fontSize
  ) => {
    // 1. Sync Alignment
    if (targetAlign !== alignment) {
      if (targetAlign === 'center') {
        write(ESC_POS_COMMANDS.ALIGN_CENTER);
      } else if (targetAlign === 'right') {
        write(ESC_POS_COMMANDS.ALIGN_RIGHT);
      } else {
        write(ESC_POS_COMMANDS.ALIGN_LEFT);
      }
      alignment = targetAlign;
    }

    // 2. Sync Bold
    if (targetBold !== isBold) {
      if (targetBold) {
        write(ESC_POS_COMMANDS.BOLD_ON);
      } else {
        write(ESC_POS_COMMANDS.BOLD_OFF);
      }
      isBold = targetBold;
    }

    // 3. Sync Font Size
    if (targetSize !== fontSize) {
      if (targetSize === 'large') {
        write(ESC_POS_COMMANDS.FONT_SIZE_LARGE);
      } else if (targetSize === 'double_width') {
        write(ESC_POS_COMMANDS.FONT_SIZE_WIDTH_DOUBLE);
      } else if (targetSize === 'double_height') {
        write(ESC_POS_COMMANDS.FONT_SIZE_HEIGHT_DOUBLE);
      } else {
        write(ESC_POS_COMMANDS.FONT_SIZE_NORMAL);
      }
      fontSize = targetSize;
    }
  };

  // Initialize printer
  write(ESC_POS_COMMANDS.INIT);

  // Traverse DOM tree recursively
  function traverse(node: Node, parentContext: { bold: boolean; align: 'left' | 'center' | 'right'; size: typeof fontSize }) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim() === '' && !text.includes('\n')) return;
      
      // Clean up whitespace inside HTML text nodes
      const sanitizedText = text.replace(/\s+/g, ' ');
      if (sanitizedText && sanitizedText !== ' ') {
        syncFormatting(parentContext.bold, parentContext.align, parentContext.size);
        writeBytes(stringToBytes(sanitizedText));
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // Copy context from parent
    const currentContext = { ...parentContext };

    // Update context based on classes or attributes
    if (el.classList.contains('text-center') || el.getAttribute('align') === 'center') {
      currentContext.align = 'center';
    } else if (el.classList.contains('text-right') || el.getAttribute('align') === 'right') {
      currentContext.align = 'right';
    } else if (el.classList.contains('text-left') || el.getAttribute('align') === 'left') {
      currentContext.align = 'left';
    }

    if (el.classList.contains('font-bold') || tagName === 'B' || tagName === 'STRONG') {
      currentContext.bold = true;
    }

    if (tagName === 'H1') {
      currentContext.size = 'large';
      currentContext.bold = true;
    } else if (tagName === 'H2') {
      currentContext.size = 'double_width';
      currentContext.bold = true;
    } else if (tagName === 'H3') {
      currentContext.size = 'double_height';
    }

    // Special Element Processing
    if (tagName === 'BR') {
      write([LF]);
      return;
    }

    if (tagName === 'HR' || el.classList.contains('border-t') || el.classList.contains('border-dashed')) {
      syncFormatting(false, 'center', 'normal');
      writeBytes(stringToBytes("-".repeat(maxCols) + "\n"));
      return;
    }

    // Process table layouts elegantly
    if (tagName === 'TR') {
      const cells = Array.from(el.querySelectorAll('td, th')) as HTMLElement[];
      if (cells.length > 0) {
        syncFormatting(currentContext.bold, 'left', currentContext.size);
        if (cells.length === 2) {
          const leftText = (cells[0].textContent || '').trim();
          const rightText = (cells[1].textContent || '').trim();
          const line = formatKeyValue(leftText, rightText, maxCols);
          writeBytes(stringToBytes(line + "\n"));
        } else if (cells.length === 3) {
          // Format common laundry rows: Service Name, Qty x Price, Subtotal
          // Or format nicely across 32 columns
          const col1 = (cells[0].textContent || '').trim();
          const col2 = (cells[1].textContent || '').trim();
          const col3 = (cells[2].textContent || '').trim();
          
          writeBytes(stringToBytes(col1 + "\n"));
          const rowLine = formatKeyValue(`  ${col2}`, col3, maxCols);
          writeBytes(stringToBytes(rowLine + "\n"));
        } else {
          // Fallback to joining all cells with a space
          const lineText = cells.map(c => (c.textContent || '').trim()).join('  ');
          writeBytes(stringToBytes(lineText + "\n"));
        }
        return;
      }
    }

    // If it's an element that behaves like a block level element, put spacing
    const isBlock = ['DIV', 'P', 'LI', 'SECTION', 'HEADER', 'FOOTER', 'TR', 'TABLE'].includes(tagName);
    
    if (isBlock && buffer.length > 0 && buffer[buffer.length - 1] !== LF) {
      // If we are block, but there is no LF, insert one
    }

    // Process children recursively
    const children = Array.from(node.childNodes);
    children.forEach(child => {
      traverse(child, currentContext);
    });

    if (isBlock && buffer.length > 0 && buffer[buffer.length - 1] !== LF) {
      write([LF]);
    }
  }

  // Traverse the body/HTML structure
  const rootNodes = Array.from(doc.body.childNodes);
  rootNodes.forEach(node => {
    traverse(node, { bold: false, align: 'left', size: 'normal' });
  });

  // Ending / paper feed
  write([LF, LF, LF, LF]);
  write(ESC_POS_COMMANDS.FEED_AND_CUT);

  return new Uint8Array(buffer);
}

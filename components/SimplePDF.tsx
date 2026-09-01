import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 30,
        textAlign: 'center',
    },
    mainTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f4e79',
        marginBottom: 8,
        textAlign: 'center',
        borderBottom: '2px solid #1f4e79',
        paddingBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
        marginTop: 8,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f4e79',
        marginBottom: 8,
        borderBottom: '1px solid #1f4e79',
        paddingBottom: 4,
    },
    text: {
        fontSize: 11,
        lineHeight: 1.4,
        color: '#000000',
        marginBottom: 4,
    },
    labelText: {
        fontSize: 11,
        color: '#000000',
        marginBottom: 4,
    },
    footer: {
        marginTop: 40,
        paddingTop: 15,
        borderTop: '1px solid #1f4e79',
        textAlign: 'center',
    },
    footerText: {
        fontSize: 10,
        color: '#666666',
        marginBottom: 3,
    },
    footerBold: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1f4e79',
    },
});

interface SimplePDFProps {
    title: string;
    content: string;
}

const SimplePDF: React.FC<SimplePDFProps> = ({ title, content }) => {
    // Parse the content to extract structured data
    const parseContent = (content: string) => {
        const sections: { title: string; content: string[] }[] = [];
        const lines = content.split('\n').filter(line => line.trim());

        let currentSection: { title: string; content: string[] } | null = null;

        lines.forEach(line => {
            const trimmedLine = line.trim();

            // Check if this is a section header (lines that end with ':' and are in caps or title case)
            if (trimmedLine.includes(':') && (
                trimmedLine === trimmedLine.toUpperCase() ||
                trimmedLine.startsWith('INFORME') ||
                trimmedLine.startsWith('DETALLES') ||
                trimmedLine.startsWith('ANÁLISIS') ||
                trimmedLine.startsWith('DESGLOSE') ||
                trimmedLine.startsWith('RESUMEN') ||
                trimmedLine.startsWith('INFORMACIÓN')
            )) {
                // Save previous section
                if (currentSection) {
                    sections.push(currentSection);
                }
                // Start new section
                currentSection = {
                    title: trimmedLine.replace(':', ''),
                    content: []
                };
            } else if (currentSection && trimmedLine) {
                currentSection.content.push(trimmedLine);
            } else if (!currentSection && trimmedLine) {
                // Handle content before first section
                if (sections.length === 0) {
                    sections.push({
                        title: 'Información General',
                        content: [trimmedLine]
                    });
                } else {
                    sections[sections.length - 1].content.push(trimmedLine);
                }
            }
        });

        // Add the last section
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections;
    };

    const sections = parseContent(content);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Content Sections */}
                {sections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>

                        {section.content.map((line, lineIndex) => {
                            return (
                                <Text key={lineIndex} style={styles.text}>{line}</Text>
                            );
                        })}
                    </View>
                ))}


            </Page>
        </Document>
    );
};

export default SimplePDF;

/**
 * ========================================
 * BASE DE DATOS DE EQUIPOS
 * ========================================
 * Todos los equipos organizados por categoría
 */

const EQUIPOS_DB = {
    'ILUMINACIÓN': {
        icon: 'lightbulb',
        emoji: '💡',
        color: '#ffc107',
        items: [
            'HMI Fresnel 1.2 kW con balasto y manguera',
            'HMI Fresnel 2.5 kW con balasto y manguera',
            'HMI Fresnel 4 kW con balasto y manguera',
            'HMI PAR 4 kW con manguera y lupas',
            'Aputure 600 D (Daylight)',
            'Aputure 1200 Bicolor',
            'Fresnel Aputure F10',
            'Nanlite 500 Bicolor',
            'Fresnel LED 200 W',
            'Fresnel LED 300 W',
            'Fresnel LED 400 W',
            'Amaran 60',
            'Amaran 120',
            'Prixma Flex 60 Dexel con perno o morza',
            'Prixma Flex 120 Dexel con perno o morza',
            'Prixma Flex 120Q Dexel con perno o morza',
            'SkyPanel S60-C (ARRI)',
            'Chimera Domo chica',
            'Chimera Domo mediana',
            'Chimera Box',
            'Chimera Aputure D',
            'Viseras',
            'Visera Aputure F10',
            'Minibruto LED',
            'Minibruto Bi-Color LED',
            'PAR LED RGBW 18×10 W',
            'Tubo LED 60 W',
            'Tubo LED 120 W',
            'Tubo LED 18 W de 45 cm',
            'Protone LED',
            'Móvil Beam 230 PLS',
            'Móvil tipo 3 en 1',
            'Barra con movimiento Avenger D520',
            'Marco 1×1 m',
            'Marco de Gridcloth',
            'Bandera de tela negra 1×1 m',
            'Pantalla plateada 1×1 m',
            'Gelatinas y difusiones'
        ]
    },

    'SOPORTES Y ESTRUCTURAS': {
        icon: 'videocam',
        emoji: '🎥',
        color: '#17a2b8',
        items: [
            'Trípode Avenger 1045CS (A100) combo',
            'Trípode Avenger 1035CS (A110) combo',
            'Trípode Avenger 1020CS (A120) combo',
            'Trípode Manfrotto (varios)',
            'Trípode Manfrotto 087NWB con malacate',
            'Trípode Manfrotto 2 tramos',
            'Trípode Manfrotto 3 tramos',
            'Ascensor extensible 3 a 5 m',
            'Ascensor',
            'Rack porta pantalla',
            'Pantalla refractaria'
        ]
    },

    'GRIPERÍA Y SUJECIÓN': {
        icon: 'build',
        emoji: '🔩',
        color: '#6f42c1',
        items: [
            'Movimiento Avenger D200',
            'Movimiento Avenger D400',
            'Brazo mágico',
            'Barra larga con movimiento',
            'Barra corta con movimiento',
            'Garra Lock-All',
            'Pinza Cocodrilo Avenger C1525',
            'Pinza Maffer Avenger C1575B con perno E600',
            'Maffer con perno',
            'Grampa Avenger C150',
            'Grampa C gris',
            'Grampa C con perno',
            'Morza C150',
            'Linga de seguridad',
            'Kit de plaquetas x 10'
        ]
    },

    'ELECTRICIDAD Y CABLES': {
        icon: 'bolt',
        emoji: '⚡',
        color: '#fd7e14',
        items: [
            'Balasto HMI 4/2.5 kW',
            'Tablero trifásico',
            'Tablero derivador trifásico x 12 bocas',
            'Tablero Dexel chico',
            'Tablero Steck 5×32',
            'Línea trifásica Steck 5×32',
            'Línea Steck 5×32 de 30 m',
            'Línea 25 mm x 16 m con fichas VR',
            'Línea 25 mm x 25 m con fichas VR',
            'Chicote trifásico',
            'Chicote Steck 5×32',
            'Chicote con terminal para borne',
            'Chicote 10×30',
            'Chicote 30×10',
            'Chicote VR hembra/macho',
            'Caja bornera',
            'Jabalina con VR',
            'Línea a tierra x 20 m',
            'Cable DMX x 10 m',
            'Cable XLR5 x 10 m',
            'Adaptador XLR5 macho / XLR3 hembra',
            'Adaptador XLR3 macho / XLR5 hembra',
            'Splitter XLR5',
            'Splitter DMX',
            'Zapatilla 30 A',
            'Zapatilla 30–10 A',
            'Zapatilla 10 A (Cambre)',
            'Alargue 30 A x 10 m',
            'Alargue 30 A x 25 m',
            'Alargue 10 A x 10 m',
            'Valija de alargues y zapatillas',
            'Valija de chicotes y herramientas'
        ]
    },

    'TRANSPORTE Y LOGÍSTICA': {
        icon: 'local_shipping',
        emoji: '🚛',
        color: '#28a745',
        items: [
            'Carro de transporte para trípodes combo',
            'Carreta de transporte',
            'Zorra de transporte',
            'Escalera dieléctrica x 12 escalones (3.5 m)',
            'Escalera telescópica',
            'Escalera x 12',
            'Bacha grande negra',
            'Bacha mediana',
            'Cajón chico',
            'Bolsa de arena'
        ]
    },

    'VARIOS': {
        icon: 'handyman',
        emoji: '🧰',
        color: '#dc3545',
        items: [
            'Handys',
            'Tres medidas',
            'Consola de luces'
        ]
    }
};

// Tipos de evento para categorizar trabajos
const TIPOS_EVENTO = [
    'Evento Gubernamental',
    'Evento Privado',
    'Publicidad',
    'Cine / Filmación',
    'Televisión',
    'Teatro',
    'Evento Corporativo',
    'Recital / Show',
    'Evento Social',
    'Otro'
];
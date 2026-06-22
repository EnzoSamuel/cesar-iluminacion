/**
 * ========================================
 * STORAGE SERVICE - CON FIREBASE
 * ========================================
 * Los datos se guardan en la nube
 * Todos los dispositivos ven lo mismo
 */

const StorageService = {

    COLECCION: 'trabajos',

    KEYS: {
        SIDEBAR: 'cesar_iluminacion_sidebar'
    },

    // =====================
    // TRABAJOS - FIRESTORE
    // =====================

    async getTrabajos() {
        try {
            const snapshot = await db.collection(this.COLECCION)
                .orderBy('createdAt', 'desc')
                .get();

            const trabajos = [];
            snapshot.forEach(doc => {
                trabajos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return trabajos;
        } catch (error) {
            console.error('Error obteniendo trabajos:', error);
            return [];
        }
    },

    async saveTrabajo(trabajo) {
        try {
            trabajo.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            trabajo.numero = await this.generarNumero();

            const docRef = await db.collection(this.COLECCION).add(trabajo);

            return {
                id: docRef.id,
                ...trabajo
            };
        } catch (error) {
            console.error('Error guardando trabajo:', error);
            throw error;
        }
    },

    async updateTrabajo(id, updatedData) {
        try {
            updatedData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection(this.COLECCION).doc(id).update(updatedData);
            return { id, ...updatedData };
        } catch (error) {
            console.error('Error actualizando trabajo:', error);
            throw error;
        }
    },

    async deleteTrabajo(id) {
        try {
            await db.collection(this.COLECCION).doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error eliminando trabajo:', error);
            throw error;
        }
    },

    async getTrabajoById(id) {
        try {
            const doc = await db.collection(this.COLECCION).doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo trabajo:', error);
            return null;
        }
    },

    async getEstadisticas() {
        try {
            const trabajos = await this.getTrabajos();
            const ahora = new Date();
            const mesActual = ahora.getMonth();
            const anioActual = ahora.getFullYear();

            const trabajosMes = trabajos.filter(t => {
                if (!t.createdAt) return false;
                const fecha = t.createdAt.toDate
                    ? t.createdAt.toDate()
                    : new Date(t.createdAt);
                return fecha.getMonth() === mesActual &&
                       fecha.getFullYear() === anioActual;
            });

            let totalEquipos = 0;
            trabajos.forEach(t => {
                if (t.equipos) {
                    Object.values(t.equipos).forEach(cant => {
                        totalEquipos += Number(cant) || 0;
                    });
                }
            });

            return {
                totalTrabajos: trabajos.length,
                trabajosMes: trabajosMes.length,
                totalEquiposUsados: totalEquipos,
                ultimoTrabajo: trabajos.length > 0 ? trabajos[0] : null
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                totalTrabajos: 0,
                trabajosMes: 0,
                totalEquiposUsados: 0,
                ultimoTrabajo: null
            };
        }
    },

    async generarNumero() {
        const trabajos = await this.getTrabajos();
        return (trabajos.length + 1).toString().padStart(4, '0');
    },

    // =====================
    // LOCAL STORAGE (solo para UI: sidebar, preferencias)
    // =====================

    saveLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    },

    getLocal(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },

    // Compatibilidad
    get(key, defaultValue = null) {
        return this.getLocal(key, defaultValue);
    },

    save(key, data) {
        return this.saveLocal(key, data);
    }
};
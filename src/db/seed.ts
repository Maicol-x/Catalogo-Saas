import { db } from './index.ts';
import { users, stores, features, featureValues, products, productImages, productFeatures, reviews } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedInitialDataIfNeeded() {
  try {
    const existingStores = await db.select().from(stores).limit(1);
    if (existingStores.length > 0) {
      return;
    }

    console.log('Seeding initial SaaS multi-tenant stores into Cloud SQL...');

    // 1. Create demo user
    const demoUserRes = await db
      .insert(users)
      .values({
        uid: 'demo_merchant_uid_1',
        email: 'contacto@elmolino.com',
        name: 'Carlos Mendoza',
        phoneNumber: '5215512345678',
        countryCode: '+52',
      })
      .returning();
    const demoUser = demoUserRes[0];

    // 2. Store 1: El Molino Café
    const store1Res = await db
      .insert(stores)
      .values({
        userId: demoUser.id,
        userUid: demoUser.uid,
        subdomain: 'elmolino',
        name: 'El Molino Café & Bakery',
        welcomeMessage: '¡Café de especialidad tostado semanalmente y repostería artesanal recién horneada! Haz tu pedido por WhatsApp y te lo preparamos al instante.',
        phoneNumber: '5215512345678',
        countryCode: '+52',
        logoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80',
        primaryColor: '#78350f',
        secondaryColor: '#fef3c7',
        backgroundColor: '#fafaf9',
        font: 'DM Sans',
        currency: 'USD',
      })
      .returning();
    const store1 = store1Res[0];

    // Features for Store 1
    const featCat1 = (await db.insert(features).values({ storeId: store1.id, name: 'Categoría' }).returning())[0];
    const featTueste = (await db.insert(features).values({ storeId: store1.id, name: 'Tueste' }).returning())[0];
    const featTam = (await db.insert(features).values({ storeId: store1.id, name: 'Tamaño' }).returning())[0];

    const valGranos = (await db.insert(featureValues).values({ featureId: featCat1.id, value: 'Café en Grano' }).returning())[0];
    const valRep = (await db.insert(featureValues).values({ featureId: featCat1.id, value: 'Repostería' }).returning())[0];
    const valBebidas = (await db.insert(featureValues).values({ featureId: featCat1.id, value: 'Bebidas' }).returning())[0];

    const valMedio = (await db.insert(featureValues).values({ featureId: featTueste.id, value: 'Medio Floral' }).returning())[0];
    const valOscuro = (await db.insert(featureValues).values({ featureId: featTueste.id, value: 'Oscuro Chocolate' }).returning())[0];

    const val250g = (await db.insert(featureValues).values({ featureId: featTam.id, value: '250g' }).returning())[0];
    const val500g = (await db.insert(featureValues).values({ featureId: featTam.id, value: '500g' }).returning())[0];

    // Product 1
    const p1 = (await db.insert(products).values({
      storeId: store1.id,
      name: 'Café Geisha Origen Huatusco',
      price: '18.50',
      summary: 'Notas de jazmín, durazno blanco y bergamota con acidez brillante.',
      description: 'Café de variedad Geisha cultivado a más de 1,600 msnm bajo sombra ecológica en las altas montañas. Cosechado a mano en su punto óptimo de maduración y sometido a un proceso de fermentación anaeróbica controlada durante 48 horas. Ideal para métodos filtrados (V60, Chemex, Aeropress).',
      isActive: true,
      sortOrder: 1,
    }).returning())[0];

    await db.insert(productImages).values([
      { productId: p1.id, url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=800&auto=format&fit=crop&q=80', sortOrder: 0 },
      { productId: p1.id, url: 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=800&auto=format&fit=crop&q=80', sortOrder: 1 },
      { productId: p1.id, url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80', sortOrder: 2 },
    ]);

    await db.insert(productFeatures).values([
      { productId: p1.id, featureValueId: valGranos.id },
      { productId: p1.id, featureValueId: valMedio.id },
      { productId: p1.id, featureValueId: val250g.id },
    ]);

    await db.insert(reviews).values([
      { productId: p1.id, authorName: 'Mariana S.', rating: 5, comment: 'El mejor café filtrado que he probado. El aroma floral se siente desde que abres el empaque.', isApproved: true },
      { productId: p1.id, authorName: 'Roberto G.', rating: 5, comment: 'Llegó rapidísimo con el pedido de WhatsApp y el tostado era de hace 3 días.', isApproved: true },
    ]);

    // Product 2
    const p2 = (await db.insert(products).values({
      storeId: store1.id,
      name: 'Croissant Bicolor de Almendras',
      price: '4.20',
      summary: 'Hojaldrado 100% mantequilla francesa con crema frangipane y almendras tostadas.',
      description: 'Nuestra masa de hojaldre artesanal es laminada pacientemente a mano durante 3 días. Relleno generoso de suave crema de almendra (frangipane) y terminado con lluvia de almendras fileteadas tostadas al momento.',
      isActive: true,
      sortOrder: 2,
    }).returning())[0];

    await db.insert(productImages).values([
      { productId: p2.id, url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80', sortOrder: 0 },
      { productId: p2.id, url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80', sortOrder: 1 },
    ]);

    await db.insert(productFeatures).values([
      { productId: p2.id, featureValueId: valRep.id },
    ]);

    // Product 3
    const p3 = (await db.insert(products).values({
      storeId: store1.id,
      name: 'Cold Brew Concentrado 500ml',
      price: '9.00',
      summary: 'Macerado en frío por 18 horas. Suave, achocolatado y con baja acidez.',
      description: 'Listo para servir con hielo o leche vegetal. Hecho con nuestro blend Signature tostado medio-oscuro.',
      isActive: true,
      sortOrder: 3,
    }).returning())[0];

    await db.insert(productImages).values([
      { productId: p3.id, url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&auto=format&fit=crop&q=80', sortOrder: 0 },
    ]);

    await db.insert(productFeatures).values([
      { productId: p3.id, featureValueId: valBebidas.id },
      { productId: p3.id, featureValueId: valOscuro.id },
    ]);

    // 3. Store 2: Moda Urbana Minimal
    const store2Res = await db
      .insert(stores)
      .values({
        userId: demoUser.id,
        userUid: demoUser.uid,
        subdomain: 'modaurbana',
        name: 'MODA URBANA Studio',
        welcomeMessage: 'Prendas esenciales de corte contemporáneo, confección ética y textiles de alta densidad. Envíos express.',
        phoneNumber: '5215587654321',
        countryCode: '+52',
        logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        coverUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
        primaryColor: '#09090b',
        secondaryColor: '#e4e4e7',
        backgroundColor: '#ffffff',
        font: 'Outfit',
        currency: 'USD',
      })
      .returning();
    const store2 = store2Res[0];

    const featModaCat = (await db.insert(features).values({ storeId: store2.id, name: 'Categoría' }).returning())[0];
    const featColor = (await db.insert(features).values({ storeId: store2.id, name: 'Color' }).returning())[0];
    const featTalla = (await db.insert(features).values({ storeId: store2.id, name: 'Talla' }).returning())[0];

    const valHoodieCat = (await db.insert(featureValues).values({ featureId: featModaCat.id, value: 'Hoodies & Sudaderas' }).returning())[0];
    const valAccCat = (await db.insert(featureValues).values({ featureId: featModaCat.id, value: 'Accesorios' }).returning())[0];

    const valNegro = (await db.insert(featureValues).values({ featureId: featColor.id, value: 'Negro Azabache' }).returning())[0];
    const valCrudo = (await db.insert(featureValues).values({ featureId: featColor.id, value: 'Blanco Crudo' }).returning())[0];

    const valM = (await db.insert(featureValues).values({ featureId: featTalla.id, value: 'M' }).returning())[0];
    const valL = (await db.insert(featureValues).values({ featureId: featTalla.id, value: 'L' }).returning())[0];

    const pModa1 = (await db.insert(products).values({
      storeId: store2.id,
      name: 'Boxy Heavyweight Hoodie 450 GSM',
      price: '64.00',
      summary: 'Corte cuadrado estructurado, algodón orgánico cepillado, sin cordones.',
      description: 'El hoodie definitivo. Confeccionado en algodón de 450 gramos con caída pesada que no pierde su forma. Costuras reforzadas a doble aguja y capucha anatómica de doble capa.',
      isActive: true,
      sortOrder: 1,
    }).returning())[0];

    await db.insert(productImages).values([
      { productId: pModa1.id, url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', sortOrder: 0 },
      { productId: pModa1.id, url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&auto=format&fit=crop&q=80', sortOrder: 1 },
    ]);

    await db.insert(productFeatures).values([
      { productId: pModa1.id, featureValueId: valHoodieCat.id },
      { productId: pModa1.id, featureValueId: valNegro.id },
      { productId: pModa1.id, featureValueId: valL.id },
    ]);

    await db.insert(reviews).values([
      { productId: pModa1.id, authorName: 'Andrés V.', rating: 5, comment: 'La calidad del tejido es irreal, muy pesado y el fit es perfecto.', isApproved: true },
    ]);

    console.log('Database seeded successfully with 2 multi-tenant stores!');
  } catch (error) {
    console.error('seedInitialDataIfNeeded error:', error);
  }
}

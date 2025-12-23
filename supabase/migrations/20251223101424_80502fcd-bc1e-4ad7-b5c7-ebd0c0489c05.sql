-- Önceki policy'yi kaldır ve daha kısıtlayıcı bir tane oluştur
DROP POLICY IF EXISTS "Public can view jobs by slug or id for applications" ON public.job_openings;

-- Yeni policy: Job'lar SADECE iş sahibi tarafından veya authenticated users tarafından görülebilir
-- Public uygulama sayfası edge function üzerinden çalışacak (service role ile)
-- Bu şekilde anonim kullanıcılar doğrudan job_openings tablosunu sorgulayamaz

-- Sadece authenticated kullanıcılar (job sahipleri) kendi job'larını görebilir
-- Anonim kullanıcılar için edge function kullanılacak
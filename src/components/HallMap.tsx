import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/b308571e-f66a-4d83-a052-33db6b1d0106";

interface Pin {
  id: number;
  label: string;
  x: number;
  y: number;
  is_rented: boolean;
  renter_name: string | null;
  rent_notes: string | null;
  price: string | null;
  image_url: string | null;
}

interface RequestForm {
  name: string;
  phone: string;
  email: string;
  message: string;
}

// ——— Форма заявки от клиента ———
function RequestModal({ pin, onClose }: { pin: Pin; onClose: () => void }) {
  const [form, setForm] = useState<RequestForm>({ name: "", phone: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    setLoading(true);
    await fetch(`${API}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_id: pin.id, pin_label: pin.label, ...form }),
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-neutral-400 hover:text-black" onClick={onClose}>
          <Icon name="X" size={20} />
        </button>
        {sent ? (
          <div className="text-center py-6">
            <Icon name="CheckCircle" size={40} className="mx-auto text-green-500 mb-3" />
            <h3 className="font-bold text-lg mb-1">Заявка отправлена!</h3>
            <p className="text-sm text-neutral-500">Мы свяжемся с вами в ближайшее время.</p>
          </div>
        ) : (
          <>
            {pin.image_url && (
              <img src={pin.image_url} alt={pin.label} className="w-full h-36 object-cover mb-4" />
            )}
            <h2 className="text-lg font-bold mb-1 uppercase tracking-wide">Заявка на аренду</h2>
            <p className="text-sm text-neutral-500 mb-1">Место: <b>{pin.label}</b></p>
            {pin.price && (
              <p className="text-sm font-semibold text-neutral-900 mb-4">
                {Number(pin.price).toLocaleString("ru-RU")} ₽/мес
              </p>
            )}
            <div className="flex flex-col gap-3">
              <input
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                placeholder="Ваше имя *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                placeholder="Телефон *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <textarea
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black resize-none"
                rows={3}
                placeholder="Комментарий"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <button
                className="bg-black text-white px-4 py-2 text-sm uppercase tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50"
                onClick={handleSubmit}
                disabled={loading || !form.name || !form.phone}
              >
                {loading ? "Отправляю..." : "Отправить заявку"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ——— Модалка редактирования точки (admin) ———
function PinEditModal({
  pin, password, onClose, onSave, onDelete,
}: {
  pin: Pin; password: string;
  onClose: () => void;
  onSave: (p: Pin) => void;
  onDelete: (id: number) => void;
}) {
  const [form, setForm] = useState({
    label: pin.label,
    price: pin.price || "",
    is_rented: pin.is_rented,
    renter_name: pin.renter_name || "",
    rent_notes: pin.rent_notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(pin.image_url);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch(`${API}/upload-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ id: pin.id, image: base64 }),
      });
      const updated = await res.json();
      setPreview(updated.image_url);
      setPhotoLoading(false);
      onSave(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch(`${API}/pins`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Password": password },
      body: JSON.stringify({ id: pin.id, ...form }),
    });
    const updated = await res.json();
    setLoading(false);
    onSave(updated);
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить точку «${pin.label}»?`)) return;
    await fetch(`${API}/pins`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-Admin-Password": password },
      body: JSON.stringify({ id: pin.id }),
    });
    onDelete(pin.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-neutral-400 hover:text-black" onClick={onClose}>
          <Icon name="X" size={20} />
        </button>
        <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Редактировать точку</h2>

        {/* Фото */}
        <label className="block mb-4 cursor-pointer group">
          <div className="relative h-32 bg-neutral-100 border border-neutral-200 overflow-hidden">
            {preview ? (
              <img src={preview} alt="фото" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 gap-1">
                <Icon name="ImagePlus" size={28} />
                <span className="text-xs uppercase tracking-wide">Фото помещения</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs uppercase tracking-wide flex items-center gap-1">
                {photoLoading ? "Загружаю..." : <><Icon name="Upload" size={13} /> Загрузить фото</>}
              </span>
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={photoLoading} />
        </label>

        <div className="flex flex-col gap-3">
          <input
            className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
            placeholder="Название"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
            placeholder="Цена, ₽/мес"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_rented}
              onChange={(e) => setForm({ ...form, is_rented: e.target.checked })}
            />
            Арендовано
          </label>
          {form.is_rented && (
            <>
              <input
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black"
                placeholder="Арендатор"
                value={form.renter_name}
                onChange={(e) => setForm({ ...form, renter_name: e.target.value })}
              />
              <textarea
                className="border border-neutral-300 px-3 py-2 text-sm w-full focus:outline-none focus:border-black resize-none"
                rows={2}
                placeholder="Примечания"
                value={form.rent_notes}
                onChange={(e) => setForm({ ...form, rent_notes: e.target.value })}
              />
            </>
          )}
          <button
            className="bg-black text-white px-4 py-2 text-sm uppercase tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Сохраняю..." : "Сохранить"}
          </button>
          <button
            className="border border-red-300 text-red-500 px-4 py-2 text-sm uppercase tracking-wide hover:bg-red-50 transition-colors"
            onClick={handleDelete}
          >
            Удалить точку
          </button>
        </div>
      </div>
    </div>
  );
}

// ——— Модалка входа ———
function PasswordModal({ onEnter, onClose }: { onEnter: (p: string) => void; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-neutral-400 hover:text-black" onClick={onClose}>
          <Icon name="X" size={20} />
        </button>
        <h2 className="text-lg font-bold mb-4 uppercase tracking-wide">Вход</h2>
        <input
          type="password"
          className="border border-neutral-300 px-3 py-2 text-sm w-full mb-3 focus:outline-none focus:border-black"
          placeholder="Пароль"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter(pwd)}
        />
        <button
          className="bg-black text-white px-4 py-2 text-sm uppercase tracking-wide w-full hover:bg-neutral-800"
          onClick={() => onEnter(pwd)}
        >
          Войти
        </button>
      </div>
    </div>
  );
}

// ——— Главный компонент ———
export default function HallMap() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const pendingActionRef = useRef<((pwd: string) => void) | null>(null);
  const [addingPin, setAddingPin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingPin, setEditingPin] = useState<Pin | null>(null);
  const [requestPin, setRequestPin] = useState<Pin | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        setImageUrl(data.image_url);
        setPins(data.pins);
      });
  }, []);

  const withAuth = (cb: (pwd: string) => void) => {
    if (adminPassword) { cb(adminPassword); return; }
    setShowPasswordModal(true);
    pendingActionRef.current = cb;
  };

  const handlePasswordEnter = (pwd: string) => {
    setAdminPassword(pwd);
    setIsAdminMode(true);
    setShowPasswordModal(false);
    if (pendingActionRef.current) {
      pendingActionRef.current(pwd);
      pendingActionRef.current = null;
    }
  };

  const handleHallPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminPassword) return;
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch(`${API}/upload-hall`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": adminPassword },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      setImageUrl(data.image_url);
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addingPin || !adminPassword || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const label = prompt("Название места:", "Место") || "Место";
    const res = await fetch(`${API}/pins`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Password": adminPassword },
      body: JSON.stringify({ label, x, y }),
    });
    const pin = await res.json();
    setPins((prev) => [...prev, pin]);
  };

  const handlePinClick = (e: React.MouseEvent, pin: Pin) => {
    e.stopPropagation();
    if (isAdminMode) {
      setEditingPin(pin);
    } else if (!pin.is_rented) {
      setRequestPin(pin);
    }
  };

  return (
    <section id="hall-map" className="bg-neutral-950 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="uppercase text-sm tracking-wide text-neutral-400 mb-2">Интерактивная схема</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">Карта торгового зала</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isAdminMode ? (
              <button
                onClick={() => withAuth(() => setIsAdminMode(true))}
                className="flex items-center gap-2 border border-neutral-600 text-neutral-400 px-4 py-2 text-xs uppercase tracking-wide hover:border-white hover:text-white transition-colors"
              >
                <Icon name="Settings" size={14} />
                Режим редактирования
              </button>
            ) : (
              <>
                <label className="flex items-center gap-2 border border-neutral-400 text-neutral-300 px-4 py-2 text-xs uppercase tracking-wide hover:border-white hover:text-white transition-colors cursor-pointer">
                  <Icon name="ImagePlus" size={14} />
                  {photoLoading ? "Загружаю..." : "Загрузить фото зала"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleHallPhotoChange} />
                </label>
                <button
                  onClick={() => setAddingPin((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wide border transition-colors ${
                    addingPin
                      ? "bg-white text-black border-white"
                      : "border-neutral-400 text-neutral-300 hover:border-white hover:text-white"
                  }`}
                >
                  <Icon name="MapPin" size={14} />
                  {addingPin ? "Кликните на карту..." : "Добавить точку"}
                </button>
                <button
                  onClick={() => { setIsAdminMode(false); setAddingPin(false); }}
                  className="flex items-center gap-2 border border-neutral-600 text-neutral-500 px-4 py-2 text-xs uppercase tracking-wide hover:border-neutral-400 hover:text-neutral-300 transition-colors"
                >
                  <Icon name="X" size={14} />
                  Выйти
                </button>
              </>
            )}
          </div>
        </div>

        {/* Легенда */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
            Свободно
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            Арендовано
          </div>
        </div>

        {/* Карта */}
        <div
          ref={imgRef}
          className={`relative w-full bg-neutral-800 overflow-hidden select-none ${addingPin ? "cursor-crosshair" : ""}`}
          style={{ minHeight: 400 }}
          onClick={handleMapClick}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Торговый зал" className="w-full h-auto block" draggable={false} />
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-neutral-500 gap-3">
              <Icon name="ImageOff" size={48} />
              <p className="text-sm uppercase tracking-wide">
                {isAdminMode ? "Загрузите фото зала кнопкой выше" : "Фото зала ещё не загружено"}
              </p>
            </div>
          )}

          {/* Точки */}
          {pins.map((pin) => (
            <button
              key={pin.id}
              onClick={(e) => handlePinClick(e, pin)}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
              title={pin.label}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-lg transition-transform duration-150 group-hover:scale-125 ${
                  pin.is_rented ? "bg-red-500" : "bg-green-400"
                }`}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col items-center gap-0.5">
                <span className="font-medium">{pin.label}</span>
                {pin.price && !pin.is_rented && (
                  <span className="text-green-300">{Number(pin.price).toLocaleString("ru-RU")} ₽/мес</span>
                )}
                {pin.is_rented && pin.renter_name ? <span className="text-red-300">{pin.renter_name}</span> : null}
                {!pin.is_rented && <span className="text-neutral-300">Свободно · кликните</span>}
              </span>
            </button>
          ))}
        </div>

        {!isAdminMode && (
          <p className="text-xs text-neutral-500 mt-3 text-center">
            Нажмите на зелёную точку, чтобы оставить заявку на аренду
          </p>
        )}
      </div>

      {showPasswordModal && <PasswordModal onEnter={handlePasswordEnter} onClose={() => setShowPasswordModal(false)} />}
      {editingPin && adminPassword && (
        <PinEditModal
          pin={editingPin}
          password={adminPassword}
          onClose={() => setEditingPin(null)}
          onSave={(updated) => { setPins((p) => p.map((x) => (x.id === updated.id ? updated : x))); setEditingPin(null); }}
          onDelete={(id) => { setPins((p) => p.filter((x) => x.id !== id)); setEditingPin(null); }}
        />
      )}
      {requestPin && <RequestModal pin={requestPin} onClose={() => setRequestPin(null)} />}
    </section>
  );
}